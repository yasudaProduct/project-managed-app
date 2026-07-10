import type { DependencyType } from "../gantt";
import { wouldCreateCycle } from "./dependencyGraph";

/** タスクバーの接続点（start=左端/開始、end=右端/終了） */
export type ConnectSide = "start" | "end";

/** チャート座標系でのタスクバーの当たり判定領域 */
export interface TaskBarHitBox {
  taskId: string;
  /** バー左端X（px） */
  x: number;
  /** バー右端X（px） */
  endX: number;
  /** 行上端Y（px） */
  top: number;
  /** 行高さ（px） */
  height: number;
}

/** 接続バリデーションに必要な最小のタスク情報 */
export type ConnectTaskNode = {
  isMilestone: boolean;
  predecessors: { taskId: string }[];
};

export type ConnectValidation =
  | { ok: true }
  | { ok: false; reason: "self" | "milestone" | "duplicate" | "cycle" | "unknown" };

/**
 * ドラッグの起点／終点それぞれの接続点から依存タイプを導出する。
 * 先行(from)の end → 後続(to)の start = FS のように、
 * 「先行のどのイベントが後続のどのイベントを起こすか」に対応する。
 */
export function deriveDependencyType(
  fromSide: ConnectSide,
  toSide: ConnectSide,
): DependencyType {
  if (fromSide === "end") {
    return toSide === "start" ? "FS" : "FF";
  }
  return toSide === "start" ? "SS" : "SF";
}

/**
 * `predecessorId` → `successorId` の依存を作成してよいか検証する。
 * 自己参照・マイルストーン・重複・循環を拒否する。
 */
export function validateConnect(
  taskById: ReadonlyMap<string, ConnectTaskNode>,
  predecessorId: string,
  successorId: string,
): ConnectValidation {
  if (predecessorId === successorId) return { ok: false, reason: "self" };

  const predecessor = taskById.get(predecessorId);
  const successor = taskById.get(successorId);
  if (!predecessor || !successor) return { ok: false, reason: "unknown" };

  if (predecessor.isMilestone || successor.isMilestone) {
    return { ok: false, reason: "milestone" };
  }
  if (successor.predecessors.some((p) => p.taskId === predecessorId)) {
    return { ok: false, reason: "duplicate" };
  }
  if (wouldCreateCycle(taskById, successorId, predecessorId)) {
    return { ok: false, reason: "cycle" };
  }
  return { ok: true };
}

/**
 * 点 (x, y) の下にあるタスクバーを返す（無ければ null）。
 * X はバー両端を含み、Y は行の上端を含み下端を含まない（隣接行と重複しないため）。
 */
export function hitTestTaskBar(
  hitBoxes: readonly TaskBarHitBox[],
  x: number,
  y: number,
): TaskBarHitBox | null {
  return (
    hitBoxes.find(
      (b) => x >= b.x && x <= b.endX && y >= b.top && y < b.top + b.height,
    ) ?? null
  );
}

/** バー内の X 位置から接続点を決める（中央より左=start、中央以降=end） */
export function connectSideAt(hitBox: TaskBarHitBox, x: number): ConnectSide {
  return x < (hitBox.x + hitBox.endX) / 2 ? "start" : "end";
}
