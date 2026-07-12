"use client";

import { useDefaultLayout } from "react-resizable-panels";

export const CS_PANE_IDS = ["customers", "summary", "chat", "actions"] as const;

/** 壊れたレイアウト保存を無効化するためバージョン付き */
export const CS_PANE_LAYOUT_STORAGE_ID = "cs-workspace-panes-v2";

/**
 * react-resizable-panels v4:
 * - Panel の defaultSize/minSize/maxSize は数値がピクセル
 * - パーセントは "20%" のような文字列で渡す
 * - Group の defaultLayout は id → パーセント(0..100) の数値マップ
 */
export const CS_PANE_DEFAULT_LAYOUT = {
  customers: 20,
  summary: 23,
  chat: 37,
  actions: 20,
} as const;

export const CS_PANE_SIZE = {
  customers: { defaultSize: "20%", minSize: "12%", maxSize: "32%" },
  summary: { defaultSize: "23%", minSize: "16%", maxSize: "36%" },
  chat: { defaultSize: "37%", minSize: "28%" },
  actions: { defaultSize: "20%", minSize: "12%", maxSize: "32%" },
} as const;

/** SSR では localStorage が無いため、安全なフォールバックを挟む */
const paneLayoutStorage = {
  getItem(name: string) {
    if (typeof window === "undefined") return null;
    try {
      return window.localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem(name: string, value: string) {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(name, value);
    } catch {
      // private mode 等で失敗してもリサイズ自体は継続する
    }
  },
};

function isValidLayout(
  layout: Record<string, number> | undefined,
): layout is Record<string, number> {
  if (!layout) return false;
  const values = CS_PANE_IDS.map((id) => layout[id]);
  if (values.some((value) => typeof value !== "number" || !Number.isFinite(value))) {
    return false;
  }
  const sum = values.reduce((total, value) => total + value, 0);
  // 極端に崩れた保存値（合計が明らかに 100% から外れる）は捨てる
  return sum > 90 && sum < 110 && values.every((value) => value >= 8);
}

export function useCsPaneLayout() {
  const { defaultLayout: savedLayout, onLayoutChanged } = useDefaultLayout({
    id: CS_PANE_LAYOUT_STORAGE_ID,
    panelIds: [...CS_PANE_IDS],
    storage: paneLayoutStorage,
    onlySaveAfterUserInteractions: true,
  });

  return {
    defaultLayout: isValidLayout(savedLayout)
      ? savedLayout
      : { ...CS_PANE_DEFAULT_LAYOUT },
    onLayoutChanged,
  };
}
