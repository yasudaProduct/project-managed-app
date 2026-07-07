"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { TaskStatus } from "@/types/wbs";
import { Pencil, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/utils/utils";
import {
  updateProgressSnapshot,
  type EditableProgressSnapshotData,
} from "@/app/wbs/[id]/progress-history-actions";

const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  NOT_STARTED: "未着手",
  IN_PROGRESS: "着手中",
  COMPLETED: "完了",
  ON_HOLD: "保留",
};

const TASK_STATUS_VALUES: TaskStatus[] = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "COMPLETED",
  "ON_HOLD",
];

const STATUS_BADGE_CLASS: Record<TaskStatus, string> = {
  NOT_STARTED: "bg-gray-400 text-white hover:bg-gray-400",
  IN_PROGRESS: "bg-blue-500 text-white hover:bg-blue-500",
  COMPLETED: "bg-green-500 text-white hover:bg-green-500",
  ON_HOLD: "bg-yellow-400 text-white hover:bg-yellow-400",
};

// マトリクスセルの背景（ステータスの淡色）
const STATUS_CELL_CLASS: Record<TaskStatus, string> = {
  NOT_STARTED: "bg-gray-100 text-gray-600",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-green-100 text-green-800",
  ON_HOLD: "bg-yellow-100 text-yellow-800",
};

type Props = {
  wbsId: number;
  wbsName: string;
  snapshots: EditableProgressSnapshotData[];
};

type RowEdit = { progressRate: string; status: TaskStatus };

/** ローカルTZでの日付キー（列のバケット単位） */
function toDateKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function formatColumnLabel(dateKey: string): { month: string; day: string } {
  const [, m, d] = dateKey.split("-");
  return { month: `${Number(m)}月`, day: `${Number(d)}` };
}

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function formatFullDateTime(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function ProgressHistoryContent({ wbsId, wbsName, snapshots }: Props) {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [filter, setFilter] = useState("");
  const [rowState, setRowState] = useState<Record<number, RowEdit>>(() =>
    Object.fromEntries(
      snapshots.map((s) => [
        s.id,
        {
          progressRate: s.progressRate !== null ? String(s.progressRate) : "",
          status: s.status,
        },
      ])
    )
  );
  const [savingId, setSavingId] = useState<number | null>(null);
  const [isBulkSaving, setIsBulkSaving] = useState(false);

  const originalState = useMemo(
    () =>
      Object.fromEntries(
        snapshots.map((s) => [
          s.id,
          {
            progressRate:
              s.progressRate !== null ? String(s.progressRate) : "",
            status: s.status,
          },
        ])
      ) as Record<number, RowEdit>,
    [snapshots]
  );

  const dirtyIds = useMemo(
    () =>
      new Set(
        Object.keys(rowState)
          .map(Number)
          .filter((id) => {
            const orig = originalState[id];
            const curr = rowState[id];
            return (
              orig &&
              curr &&
              (orig.progressRate !== curr.progressRate ||
                orig.status !== curr.status)
            );
          })
      ),
    [rowState, originalState]
  );

  // 列 = 記録日（昇順）
  const dateKeys = useMemo(() => {
    const keys = new Set(snapshots.map((s) => toDateKey(s.snapshotAt)));
    return Array.from(keys).sort();
  }, [snapshots]);

  // 行 = タスク（taskNo昇順・サーバー順）。セル = 日付ごとのスナップショット（時刻昇順）
  const taskRows = useMemo(() => {
    const map = new Map<
      string,
      {
        taskNo: string;
        taskName: string;
        byDate: Map<string, EditableProgressSnapshotData[]>;
      }
    >();
    for (const s of snapshots) {
      if (!map.has(s.taskNo)) {
        map.set(s.taskNo, {
          taskNo: s.taskNo,
          taskName: s.taskName,
          byDate: new Map(),
        });
      }
      const row = map.get(s.taskNo)!;
      const key = toDateKey(s.snapshotAt);
      if (!row.byDate.has(key)) row.byDate.set(key, []);
      row.byDate.get(key)!.push(s);
    }
    return Array.from(map.values());
  }, [snapshots]);

  const filteredRows = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return taskRows;
    return taskRows.filter(
      (r) =>
        r.taskNo.toLowerCase().includes(q) ||
        r.taskName.toLowerCase().includes(q)
    );
  }, [taskRows, filter]);

  // 初期表示で最新（右端）の記録が見えるようスクロール
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [dateKeys.length]);

  const setRow = (id: number, patch: Partial<RowEdit>) => {
    setRowState((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  const handleSave = async (id: number): Promise<boolean> => {
    const state = rowState[id];
    if (!state) return false;

    const trimmed = state.progressRate.trim();
    let progressRate: number | null;
    if (trimmed === "") {
      progressRate = null;
    } else {
      const parsed = Number(trimmed);
      if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
        toast({
          title: "入力エラー",
          description: "進捗率は0〜100の数値で入力してください。",
          variant: "destructive",
        });
        return false;
      }
      progressRate = parsed;
    }

    setSavingId(id);
    try {
      const result = await updateProgressSnapshot({
        wbsId,
        id,
        progressRate,
        status: state.status,
      });

      if (result.success) {
        return true;
      } else {
        toast({
          title: "保存に失敗しました",
          description: result.error,
          variant: "destructive",
        });
        return false;
      }
    } finally {
      setSavingId(null);
    }
  };

  const handleSaveSingle = async (id: number) => {
    const ok = await handleSave(id);
    if (ok) {
      toast({ title: "保存しました" });
      router.refresh();
    }
  };

  const handleBulkSave = async () => {
    setIsBulkSaving(true);
    try {
      const results = await Promise.all(
        [...dirtyIds].map((id) => handleSave(id))
      );
      const successCount = results.filter(Boolean).length;
      if (successCount > 0) {
        toast({ title: `${successCount} 件を保存しました` });
        router.refresh();
      }
    } finally {
      setIsBulkSaving(false);
    }
  };

  return (
    <div className="px-4 py-4">
      {/* コンパクトヘッダー：タイトル・説明・フィルタ・一括保存を1段に収める */}
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900 leading-tight">
            進捗履歴の訂正
          </h1>
          <p className="text-xs text-gray-500">
            {wbsName} ─ セルをクリックすると各時点の進捗率・ステータスを訂正できます（過去のEVMに反映されます）
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="タスクNo・タスク名で絞り込み"
              className="h-8 w-56 pl-7 text-sm"
            />
          </div>
          {snapshots.length > 0 && (
            <Button
              size="sm"
              onClick={handleBulkSave}
              disabled={dirtyIds.size === 0 || isBulkSaving}
              className="shrink-0"
            >
              {isBulkSaving
                ? "保存中..."
                : dirtyIds.size > 0
                ? `一括保存 (${dirtyIds.size})`
                : "一括保存"}
            </Button>
          )}
        </div>
      </div>

      {/* サマリ＋凡例 */}
      {snapshots.length > 0 && (
        <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
          <span>
            {filteredRows.length} / {taskRows.length} タスク・{snapshots.length} 記録
          </span>
          <span className="flex items-center gap-2">
            {TASK_STATUS_VALUES.map((s) => (
              <span key={s} className="flex items-center gap-1">
                <span
                  className={cn(
                    "inline-block h-2.5 w-2.5 rounded-sm",
                    STATUS_CELL_CLASS[s].split(" ")[0]
                  )}
                />
                {TASK_STATUS_LABELS[s]}
              </span>
            ))}
            <span className="flex items-center gap-1">
              <Pencil className="h-3 w-3" />
              手動記録
            </span>
          </span>
        </div>
      )}

      {snapshots.length === 0 ? (
        <p className="text-gray-500 text-sm">
          訂正対象のスナップショットがありません。WBSを同期するかガントでタスクを編集すると履歴が蓄積されます。
        </p>
      ) : (
        <div
          ref={scrollRef}
          className="w-fit max-w-full overflow-auto rounded border max-h-[calc(100vh-160px)]"
        >
          <table className="border-separate border-spacing-0 text-xs">
            <thead>
              <tr>
                <th className="sticky left-0 top-0 z-30 w-24 min-w-24 border-b border-r bg-gray-50 px-2 py-1.5 text-left font-medium text-gray-600">
                  No
                </th>
                <th className="sticky left-24 top-0 z-30 w-56 min-w-56 border-b border-r bg-gray-50 px-2 py-1.5 text-left font-medium text-gray-600">
                  タスク名
                </th>
                {dateKeys.map((key) => {
                  const { month, day } = formatColumnLabel(key);
                  return (
                    <th
                      key={key}
                      title={key}
                      className="sticky top-0 z-20 min-w-14 border-b bg-gray-50 px-1 py-1 text-center font-medium text-gray-600"
                    >
                      <div className="text-[10px] leading-none text-gray-400">
                        {month}
                      </div>
                      <div className="leading-tight">{day}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr key={row.taskNo} className="group">
                  <td className="sticky left-0 z-10 whitespace-nowrap border-b border-r bg-white px-2 py-0.5 font-mono text-[11px] text-gray-700 group-hover:bg-gray-50">
                    {row.taskNo}
                  </td>
                  <td
                    className="sticky left-24 z-10 max-w-56 truncate border-b border-r bg-white px-2 py-0.5 text-gray-900 group-hover:bg-gray-50"
                    title={row.taskName}
                  >
                    {row.taskName}
                  </td>
                  {dateKeys.map((key) => {
                    const cellSnaps = row.byDate.get(key);
                    if (!cellSnaps || cellSnaps.length === 0) {
                      return (
                        <td
                          key={key}
                          className="border-b px-1 py-0.5 text-center text-gray-300 group-hover:bg-gray-50"
                        >
                          ・
                        </td>
                      );
                    }
                    // セル表示はその日の最新記録（編集中の値を反映）
                    const latest = cellSnaps[cellSnaps.length - 1];
                    const state = rowState[latest.id];
                    const cellDirty = cellSnaps.some((s) => dirtyIds.has(s.id));
                    const status = state?.status ?? latest.status;
                    const rateLabel =
                      state?.progressRate === "" || state?.progressRate == null
                        ? "−"
                        : `${state.progressRate}`;

                    return (
                      <td
                        key={key}
                        className="border-b p-0.5 text-center group-hover:bg-gray-50"
                      >
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              className={cn(
                                "relative h-6 w-full min-w-12 rounded px-1 font-medium tabular-nums transition-shadow hover:shadow",
                                STATUS_CELL_CLASS[status],
                                cellDirty && "ring-2 ring-amber-400"
                              )}
                              title={`${row.taskNo} ${key}（${cellSnaps.length}件）`}
                            >
                              {rateLabel}
                              {latest.source === "manual" && (
                                <Pencil className="absolute right-0.5 top-0.5 h-2 w-2 opacity-60" />
                              )}
                            </button>
                          </PopoverTrigger>
                          <PopoverContent
                            align="center"
                            className="w-80 p-3"
                            onOpenAutoFocus={(e) => e.preventDefault()}
                          >
                            <div className="mb-2 text-xs font-medium text-gray-700">
                              {row.taskNo}{" "}
                              <span className="text-gray-500">{row.taskName}</span>
                            </div>
                            <div className="space-y-3">
                              {cellSnaps.map((snap) => {
                                const snapState = rowState[snap.id];
                                const isDirty = dirtyIds.has(snap.id);
                                const sliderValue =
                                  snapState?.progressRate === ""
                                    ? 0
                                    : Number(snapState?.progressRate) || 0;
                                return (
                                  <div
                                    key={snap.id}
                                    className={cn(
                                      "rounded border p-2",
                                      isDirty && "border-amber-400 bg-amber-50/50"
                                    )}
                                  >
                                    <div className="mb-1.5 flex items-center gap-2 text-[11px] text-gray-500">
                                      <span title={formatFullDateTime(snap.snapshotAt)}>
                                        {formatTime(snap.snapshotAt)}
                                      </span>
                                      <Badge
                                        variant="outline"
                                        className="h-4 px-1 text-[10px] font-normal"
                                      >
                                        {snap.source === "manual" ? "手動" : "同期"}
                                      </Badge>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Slider
                                        min={0}
                                        max={100}
                                        step={1}
                                        value={[sliderValue]}
                                        onValueChange={([v]) =>
                                          setRow(snap.id, { progressRate: String(v) })
                                        }
                                        className="w-24"
                                      />
                                      <Input
                                        type="number"
                                        min={0}
                                        max={100}
                                        value={snapState?.progressRate ?? ""}
                                        onChange={(e) =>
                                          setRow(snap.id, {
                                            progressRate: e.target.value,
                                          })
                                        }
                                        className="h-7 w-14 px-1 text-center text-xs"
                                      />
                                      <Select
                                        value={snapState?.status}
                                        onValueChange={(v) =>
                                          setRow(snap.id, { status: v as TaskStatus })
                                        }
                                      >
                                        <SelectTrigger className="h-auto w-auto border-0 p-0 shadow-none focus:ring-0">
                                          <Badge
                                            className={cn(
                                              "cursor-pointer",
                                              snapState?.status
                                                ? STATUS_BADGE_CLASS[snapState.status]
                                                : ""
                                            )}
                                          >
                                            {snapState?.status
                                              ? TASK_STATUS_LABELS[snapState.status]
                                              : ""}
                                          </Badge>
                                        </SelectTrigger>
                                        <SelectContent>
                                          {TASK_STATUS_VALUES.map((s) => (
                                            <SelectItem key={s} value={s}>
                                              <Badge className={STATUS_BADGE_CLASS[s]}>
                                                {TASK_STATUS_LABELS[s]}
                                              </Badge>
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      <Button
                                        size="sm"
                                        variant={isDirty ? "default" : "outline"}
                                        className="ml-auto h-7 px-2 text-xs"
                                        onClick={() => handleSaveSingle(snap.id)}
                                        disabled={savingId === snap.id || isBulkSaving}
                                      >
                                        {savingId === snap.id ? "保存中" : "保存"}
                                      </Button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </PopoverContent>
                        </Popover>
                      </td>
                    );
                  })}
                </tr>
              ))}
              {filteredRows.length === 0 && (
                <tr>
                  <td
                    colSpan={2 + dateKeys.length}
                    className="px-2 py-6 text-center text-gray-400"
                  >
                    絞り込みに一致するタスクがありません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
