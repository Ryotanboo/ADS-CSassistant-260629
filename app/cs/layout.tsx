import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { TooltipProvider } from "@/components/ui/tooltip";
import { isEmailAllowed } from "@/lib/allowed-emails";

export const metadata: Metadata = {
  title: "CSアシスタント",
  description: "CSチーム向け 上司役AI 1-on-1 作業台",
};

export default async function CsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const email = session?.user?.email?.trim().toLowerCase();
  if (!email || !isEmailAllowed(email) || !session?.user) {
    redirect("/login?reason=auth&callbackUrl=/cs");
  }

  return (
    <div className="cs-theme flex h-full flex-col">
      <TooltipProvider delay={300}>{children}</TooltipProvider>
    </div>
  );
}
