import type { Metadata } from "next";
import { TooltipProvider } from "@/components/ui/tooltip";

export const metadata: Metadata = {
  title: "CSアシスタント",
  description: "CSチーム向け 上司役AI 1-on-1 作業台",
};

export default function CsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="cs-theme flex h-full flex-col">
      <TooltipProvider delay={300}>{children}</TooltipProvider>
    </div>
  );
}
