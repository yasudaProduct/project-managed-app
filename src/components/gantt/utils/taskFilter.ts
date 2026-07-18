import type { Task, TaskStatus } from "../gantt";

// キーワードの照合方式：部分一致 or 正規表現
export type KeywordMode = "partial" | "regex";

/**
 * ガントのタスク絞り込み条件。
 * - keyword: タスク名の検索文字列（部分一致は空白/カンマ区切りで複数語=OR）
 * - keywordMode: `partial`（部分一致）/ `regex`（正規表現）
 * - statuses: 表示するステータス（空なら制約なし）
 * - assignees: 表示する担当者名（空なら制約なし。未割当は UNASSIGNED_LABEL）
 */
export interface TaskFilter {
  keyword: string;
  keywordMode: KeywordMode;
  statuses: TaskStatus[];
  assignees: string[];
}

// 未割当タスクを表す担当者キー（フィルタ選択肢/照合の両方で使用）
export const UNASSIGNED_LABEL = "未割当";

// フィルタ未設定（全件表示）の初期値
export const EMPTY_TASK_FILTER: TaskFilter = {
  keyword: "",
  keywordMode: "partial",
  statuses: [],
  assignees: [],
};

/** いずれかの条件が指定されているか（未指定なら絞り込み不要=全件） */
export function isTaskFilterActive(filter: TaskFilter): boolean {
  return (
    filter.keyword.trim().length > 0 ||
    filter.statuses.length > 0 ||
    filter.assignees.length > 0
  );
}

/** 現在の有効な条件の数（UIのバッジ表示に使用） */
export function countActiveFilters(filter: TaskFilter): number {
  return (
    (filter.keyword.trim().length > 0 ? 1 : 0) +
    filter.statuses.length +
    filter.assignees.length
  );
}

/** 正規表現として妥当か（空文字は妥当扱い）。UIのエラー表示に使用 */
export function isValidRegex(pattern: string): boolean {
  if (pattern.trim().length === 0) return true;
  try {
    void new RegExp(pattern);
    return true;
  } catch {
    return false;
  }
}

// キーワードを複数語へ分解（半角/全角空白・カンマ・読点で分割）
function splitKeywords(keyword: string): string[] {
  return keyword
    .split(/[\s,、　]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

// タスク名の照合関数を作る（正規表現は1回だけコンパイルして使い回す）
function makeNameMatcher(filter: TaskFilter): (name: string) => boolean {
  const raw = filter.keyword.trim();
  if (raw.length === 0) return () => true;

  if (filter.keywordMode === "regex") {
    let re: RegExp | null = null;
    try {
      re = new RegExp(raw, "i");
    } catch {
      // 不正な正規表現は「絞り込みなし（全件表示）」として扱う（入力途中対策）
      re = null;
    }
    return (name) => (re ? re.test(name) : true);
  }

  // 部分一致：複数語は OR、大文字小文字は無視
  const terms = splitKeywords(raw).map((t) => t.toLowerCase());
  if (terms.length === 0) return () => true;
  return (name) => {
    const lower = name.toLowerCase();
    return terms.some((t) => lower.includes(t));
  };
}

// 担当者キー（未設定は UNASSIGNED_LABEL に正規化）
function assigneeKey(task: Task): string {
  const a = task.assignee?.trim();
  return a && a.length > 0 ? a : UNASSIGNED_LABEL;
}

/**
 * タスク一覧を条件で絞り込む純粋関数。
 *
 * - keyword: タスク名に対する部分一致（複数語 OR）または正規表現。
 *   不正な正規表現は無視して全件を返す（入力途中で一覧が消えないように）。
 * - statuses: 選択したステータスのいずれかに一致（未設定は NOT_STARTED として扱う）。
 * - assignees: 選択した担当者のいずれかに一致（未割当は UNASSIGNED_LABEL）。
 *
 * 条件が1つも無い場合は元配列をそのまま返す（参照を保ち再レンダーを抑制）。
 */
export function filterTasks(tasks: Task[], filter: TaskFilter): Task[] {
  if (!isTaskFilterActive(filter)) return tasks;

  const matchesName = makeNameMatcher(filter);
  const statusSet = new Set(filter.statuses);
  const assigneeSet = new Set(filter.assignees);

  return tasks.filter((task) => {
    if (!matchesName(task.name)) return false;
    if (statusSet.size > 0) {
      const status = task.status ?? "NOT_STARTED";
      if (!statusSet.has(status)) return false;
    }
    if (assigneeSet.size > 0 && !assigneeSet.has(assigneeKey(task))) {
      return false;
    }
    return true;
  });
}
