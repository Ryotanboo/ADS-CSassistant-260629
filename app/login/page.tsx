import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";

import { auth, signIn } from "@/auth";
import { Button } from "@/components/ui/button";

type LoginPageProps = {
  searchParams: Promise<{
    callbackUrl?: string;
    error?: string;
    reason?: string;
  }>;
};

function resolveMessage(error?: string, reason?: string) {
  if (error === "AccessDenied") {
    return {
      title: "このアカウントでは利用できません",
      body: "許可された社内アカウントでサインインするか、管理者に追加を依頼してください。",
    };
  }
  if (error === "OAuthCallbackError" || error === "OAuthSignin") {
    return {
      title: "サインインを完了できませんでした",
      body: "もう一度お試しください。",
    };
  }
  if (error) {
    return {
      title: "サインインを完了できませんでした",
      body: "もう一度お試しください。",
    };
  }
  if (reason === "session") {
    return {
      title: "セッションの有効期限が切れました",
      body: "再度サインインしてください。",
    };
  }
  if (reason === "auth") {
    return {
      title: "サインインが必要です",
      body: "社内メンバー向けです。Googleアカウントでサインインしてください。",
    };
  }
  return {
    title: "CSアシスタント",
    body: "社内メンバー向け。Googleアカウントでサインインしてください。",
  };
}

function sanitizeCallbackUrl(callbackUrl?: string) {
  if (!callbackUrl || !callbackUrl.startsWith("/") || callbackUrl.startsWith("//")) {
    return "/cs";
  }
  return callbackUrl;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await auth();
  if (session?.user) {
    redirect("/cs");
  }

  const params = await searchParams;
  const message = resolveMessage(params.error, params.reason);
  const callbackUrl = sanitizeCallbackUrl(params.callbackUrl);
  const showRetryHint = Boolean(params.error);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="flex w-full max-w-md flex-col gap-6 rounded-xl border border-border bg-card p-8 shadow-sm">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-brand">
            <div className="flex size-9 items-center justify-center rounded-lg bg-brand text-brand-foreground">
              <Sparkles aria-hidden className="size-4" />
            </div>
            <p className="text-sm font-semibold text-foreground">CSアシスタント</p>
          </div>
          <div className="flex flex-col gap-2">
            <h1 className="text-xl font-semibold text-foreground">
              {message.title}
            </h1>
            <p className="text-sm text-muted-foreground">{message.body}</p>
          </div>
        </div>

        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: callbackUrl });
          }}
        >
          <Button type="submit" className="w-full">
            {showRetryHint ? "別のアカウントで続ける" : "Googleで続ける"}
          </Button>
        </form>
      </div>
    </div>
  );
}
