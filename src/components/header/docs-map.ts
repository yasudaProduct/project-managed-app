export interface DocsMapEntry {
  pattern: RegExp;
  docId: string;
  title: string;
}

// 具体的なパスから先に評価されるよう、より深いパスを上に置く
export const DOCS_MAP: DocsMapEntry[] = [
  {
    pattern: /^\/wbs\/[^/]+\/ganttv2$/,
    docId: "wbs-ganttv2",
    title: "ガントチャート",
  },
  {
    pattern: /^\/projects\/[^/]+$/,
    docId: "project-detail",
    title: "プロジェクト詳細",
  },
  {
    pattern: /^\/$/,
    docId: "home",
    title: "ホーム",
  },
];

export function resolveDoc(pathname: string): DocsMapEntry | undefined {
  return DOCS_MAP.find((entry) => entry.pattern.test(pathname));
}
