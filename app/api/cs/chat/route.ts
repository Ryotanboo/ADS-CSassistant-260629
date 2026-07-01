import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest } from "next/server";
import { z } from "zod";
import { buildSystemPrompt } from "@/lib/cs-ai-prompt";
import { customerSchema, chatMessageSchema } from "@/lib/cs-schema";

const requestSchema = z.object({
  customer: customerSchema,
  messages: z.array(chatMessageSchema),
});

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "GEMINI_API_KEY が設定されていません" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "リクエストの解析に失敗しました" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    console.error("[cs/chat] Zod validation error:", JSON.stringify(parsed.error.issues, null, 2));
    return new Response(JSON.stringify({ error: "リクエストの形式が不正です" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { customer, messages } = parsed.data;
  const systemPrompt = buildSystemPrompt(customer);

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: systemPrompt,
  });

  // Gemini の history 形式へ変換（最後のユーザーメッセージは history に含めない）
  const historyMessages = messages.slice(0, -1);
  const lastMessage = messages[messages.length - 1];

  if (!lastMessage || lastMessage.role !== "user") {
    return new Response(JSON.stringify({ error: "最後のメッセージはユーザーのメッセージである必要があります" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const allHistory = historyMessages.map((m) => ({
    role: m.role === "user" ? ("user" as const) : ("model" as const),
    parts: [{ text: m.content }],
  }));
  // Gemini は history の先頭が必ず user でなければならない
  const firstUserIndex = allHistory.findIndex((h) => h.role === "user");
  const history = firstUserIndex > 0 ? allHistory.slice(firstUserIndex) : allHistory;

  const chat = model.startChat({ history });

  let stream: AsyncGenerator<{ text(): string }>;
  try {
    const result = await chat.sendMessageStream(lastMessage.content);
    stream = result.stream;
  } catch (err) {
    console.error("[cs/chat] Gemini API error:", err);
    return new Response(
      JSON.stringify({ error: "AI との通信に失敗しました。しばらくしてからお試しください。" }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }

  // テキストチャンクを Server-Sent Events 形式でストリーミング
  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const text = chunk.text();
          if (text) {
            // SSE 形式: "data: <テキスト>\n\n"
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(text)}\n\n`));
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (err) {
        console.error("[cs/chat] streaming error:", err);
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: "ストリーミング中にエラーが発生しました" })}\n\n`),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
