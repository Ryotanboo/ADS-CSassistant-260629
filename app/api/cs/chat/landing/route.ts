import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest } from "next/server";
import { z } from "zod";
import { buildLandingPrompt } from "@/lib/cs-ai-prompt";
import {
  customerSchema,
  chatMessageSchema,
  consultationSchema,
  landingCardSchema,
  nextActionSchema,
} from "@/lib/cs-schema";
import { requireUser } from "@/lib/require-user";

const requestSchema = z.object({
  customer: customerSchema,
  messages: z.array(chatMessageSchema),
  consultations: z.array(consultationSchema).default([]),
  nextActions: z.array(nextActionSchema).default([]),
  currentUserName: z.string().min(1).default("担当CS"),
});

export async function POST(req: NextRequest) {
  try {
    await requireUser();
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "GEMINI_API_KEY が設定されていません" },
      { status: 500 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json(
      { error: "リクエストの解析に失敗しました" },
      { status: 400 },
    );
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    console.error(
      "[cs/landing] Zod validation error:",
      JSON.stringify(parsed.error.issues, null, 2),
    );
    return Response.json(
      { error: "リクエストの形式が不正です" },
      { status: 400 },
    );
  }

  const { customer, messages, consultations, nextActions, currentUserName } =
    parsed.data;
  const prompt = buildLandingPrompt(
    customer,
    messages,
    consultations,
    nextActions,
    currentUserName,
  );

  const genAI = new GoogleGenerativeAI(apiKey);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const responseSchema: any = {
    type: "object",
    properties: {
      summary: { type: "array", items: { type: "string" } },
      openQuestions: { type: "array", items: { type: "string" } },
      nextActions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            label: { type: "string" },
            priority: { type: "string", enum: ["high", "medium", "low"] },
          },
          required: ["label", "priority"],
        },
      },
    },
    required: ["summary", "openQuestions", "nextActions"],
  };

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema,
    },
  });

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      console.error("[cs/landing] JSON parse error. Raw text:", text);
      return Response.json(
        { error: "AI の出力を解析できませんでした" },
        { status: 500 },
      );
    }

    const validated = landingCardSchema.safeParse(json);
    if (!validated.success) {
      console.error(
        "[cs/landing] Zod validation error:",
        JSON.stringify(validated.error.issues, null, 2),
      );
      return Response.json(
        { error: "AI の出力形式が不正でした" },
        { status: 500 },
      );
    }

    return Response.json(validated.data);
  } catch (err) {
    console.error("[cs/landing] Gemini API error:", err);
    return Response.json(
      { error: "AI との通信に失敗しました。しばらくしてからお試しください。" },
      { status: 502 },
    );
  }
}
