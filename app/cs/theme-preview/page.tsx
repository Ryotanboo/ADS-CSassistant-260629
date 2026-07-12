import type { Metadata } from "next";

import {
  CsThemePreview,
  isCsPreviewTheme,
} from "@/components/cs/CsThemePreview";

export const metadata: Metadata = {
  title: "CSアシスタント テーマ比較",
};

type ThemePreviewPageProps = {
  searchParams: Promise<{ theme?: string }>;
};

export default async function ThemePreviewPage({
  searchParams,
}: ThemePreviewPageProps) {
  const { theme } = await searchParams;
  const selectedTheme = isCsPreviewTheme(theme) ? theme : "stories-contrast";

  return <CsThemePreview theme={selectedTheme} />;
}
