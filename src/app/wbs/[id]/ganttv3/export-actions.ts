"use server";

import { container } from "@/lib/inversify.config";
import { SYMBOL } from "@/types/symbol";
import { ITaskRepository } from "@/applications/task/itask-repository";
import { TaskDependencyService } from "@/applications/task-dependency/task-dependency.service";

// TSVのヘッダー（出力列の順序）
const HEADERS = [
  "フェーズ",
  "タスクNo",
  "タスク名",
  "基準開始日",
  "基準終了日",
  "基準工数",
  "予定開始日",
  "予定終了日",
  "予定工数",
  "実績開始日",
  "実績終了日",
  "実績工数",
  "進捗率",
  "先行タスクNo",
  "依存種別",
  "遅延",
];

// 保存はUTC前提。スケジュール日として UTC 暦日を YYYY-MM-DD で出力する
function fmtDate(d?: Date): string {
  if (!d) return "";
  return d.toISOString().slice(0, 10);
}

function fmtNum(n?: number | null): string {
  return n === undefined || n === null ? "" : String(n);
}

// セル内のタブ・改行を空白へ置換し、TSVの列崩れを防ぐ
function sanitize(value: string): string {
  return value.replace(/[\t\r\n]+/g, " ");
}

/**
 * WBSのタスクを TSV 文字列で出力する。
 * 基準/予定/実績の各期間・工数、進捗率、依存関係（先行タスク）を含む。
 */
export async function getGanttTasksTsv(wbsId: number): Promise<string> {
  const taskRepository = container.get<ITaskRepository>(SYMBOL.ITaskRepository);
  const dependencyService = container.get<TaskDependencyService>(
    SYMBOL.ITaskDependencyService
  );

  const tasks = await taskRepository.findAll(wbsId);
  const dependencies = await dependencyService.getDependenciesByWbsId(wbsId);

  // タスクID → タスクNo（依存関係の表示用）
  const taskNoById = new Map<number, string>();
  for (const t of tasks) {
    if (t.id !== undefined) taskNoById.set(t.id, t.taskNo.getValue());
  }

  // 後続タスクID → 先行依存のリスト（タスクNo・種別・遅延を個別に保持）
  const depBySuccessor = new Map<
    number,
    { predNo: string; type: string; lag: number }[]
  >();
  for (const dep of dependencies) {
    const predNo =
      taskNoById.get(dep.predecessorTaskId) ?? `#${dep.predecessorTaskId}`;
    const list = depBySuccessor.get(dep.successorTaskId) ?? [];
    list.push({ predNo, type: dep.type, lag: dep.lag });
    depBySuccessor.set(dep.successorTaskId, list);
  }

  // フェーズseq → タスクNo の順に並べる
  const sorted = [...tasks].sort((a, b) => {
    const sa = a.phase?.seq ?? Number.MAX_SAFE_INTEGER;
    const sb = b.phase?.seq ?? Number.MAX_SAFE_INTEGER;
    if (sa !== sb) return sa - sb;
    return a.taskNo.getValue().localeCompare(b.taskNo.getValue());
  });

  const rows = sorted.map((task) => {
    const deps = task.id !== undefined ? depBySuccessor.get(task.id) ?? [] : [];
    // 複数依存は対応位置を揃えて "; " 区切りで出力する
    const predNoCol = deps.map((d) => d.predNo).join("; ");
    const typeCol = deps.map((d) => d.type).join("; ");
    const lagCol = deps.map((d) => String(d.lag)).join("; ");

    return [
      task.phase?.name ?? "",
      task.taskNo.getValue(),
      task.name,
      fmtDate(task.getKijunStart()),
      fmtDate(task.getKijunEnd()),
      fmtNum(task.getKijunKosus()),
      fmtDate(task.getYoteiStart()),
      fmtDate(task.getYoteiEnd()),
      fmtNum(task.getYoteiKosus()),
      fmtDate(task.getJissekiStart()),
      fmtDate(task.getJissekiEnd()),
      fmtNum(task.getJissekiKosus()),
      fmtNum(task.progressRate),
      predNoCol,
      typeCol,
      lagCol,
    ].map((cell) => sanitize(String(cell)));
  });

  return [HEADERS.join("\t"), ...rows.map((r) => r.join("\t"))].join("\n");
}
