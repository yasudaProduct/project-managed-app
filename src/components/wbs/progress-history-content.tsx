"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { TaskStatus } from "@/types/wbs";
import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

type Props = {
  wbsId: number;
  wbsName: string;
  snapshots: EditableProgressSnapshotData[];
};

function formatSnapshotAt(iso: string): string {
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

  const [rowState, setRowState] = useState<
    Record<number, { progressRate: string; status: TaskStatus }>
  >(() =>
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
      ),
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

  const groups = useMemo(() => {
    const map = new Map<
      string,
      { taskNo: string; taskName: string; rows: EditableProgressSnapshotData[] }
    >();
    for (const s of snapshots) {
      const key = s.taskNo;
      if (!map.has(key)) {
        map.set(key, { taskNo: s.taskNo, taskName: s.taskName, rows: [] });
      }
      map.get(key)!.rows.push(s);
    }
    return Array.from(map.values());
  }, [snapshots]);

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(
    () => Object.fromEntries(groups.map((g) => [g.taskNo, true]))
  );

  const setRow = (
    id: number,
    patch: Partial<{ progressRate: string; status: TaskStatus }>
  ) => {
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
      const results = await Promise.all([...dirtyIds].map((id) => handleSave(id)));
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
    <div className="container mx-auto py-10">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">進捗履歴の訂正</h1>
          <p className="text-gray-600 mt-1">{wbsName}</p>
          <p className="text-sm text-gray-500 mt-2">
            各同期時点に記録された進捗率・ステータスを訂正できます。訂正は過去のEVMにも反映されます。
          </p>
        </div>
        {groups.length > 0 && (
          <Button
            onClick={handleBulkSave}
            disabled={dirtyIds.size === 0 || isBulkSaving}
            className="shrink-0"
          >
            {isBulkSaving
              ? "保存中..."
              : dirtyIds.size > 0
              ? `一括保存 (${dirtyIds.size} 件)`
              : "一括保存"}
          </Button>
        )}
      </div>

      {groups.length === 0 ? (
        <p className="text-gray-500">
          訂正対象のスナップショットがありません。WBSを同期すると履歴が蓄積されます。
        </p>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => {
            const groupDirtyCount = group.rows.filter((r) =>
              dirtyIds.has(r.id)
            ).length;
            const isOpen = openGroups[group.taskNo] ?? true;

            return (
              <Collapsible
                key={group.taskNo}
                open={isOpen}
                onOpenChange={(open) =>
                  setOpenGroups((prev) => ({ ...prev, [group.taskNo]: open }))
                }
              >
                <CollapsibleTrigger asChild>
                  <button className="flex items-center gap-2 w-full text-left py-2 hover:bg-gray-50 rounded px-1 transition-colors">
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 text-gray-500 transition-transform duration-200",
                        !isOpen && "-rotate-90"
                      )}
                    />
                    <span className="text-lg font-semibold">
                      {group.taskNo} {group.taskName}
                    </span>
                    {groupDirtyCount > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {groupDirtyCount} 件変更
                      </Badge>
                    )}
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-2 mb-6">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[180px]">記録時点</TableHead>
                          <TableHead className="w-[260px]">進捗率(%)</TableHead>
                          <TableHead className="w-[160px]">ステータス</TableHead>
                          <TableHead className="w-[100px]">操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.rows.map((row) => {
                          const state = rowState[row.id];
                          const isDirty = dirtyIds.has(row.id);
                          const sliderValue =
                            state?.progressRate === ""
                              ? 0
                              : Number(state?.progressRate) || 0;

                          return (
                            <TableRow
                              key={row.id}
                              className={cn(isDirty && "bg-yellow-50")}
                            >
                              <TableCell className="text-sm">
                                {formatSnapshotAt(row.snapshotAt)}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <Slider
                                    min={0}
                                    max={100}
                                    step={1}
                                    value={[sliderValue]}
                                    onValueChange={([v]) =>
                                      setRow(row.id, {
                                        progressRate: String(v),
                                      })
                                    }
                                    className="w-32"
                                  />
                                  <Input
                                    type="number"
                                    min={0}
                                    max={100}
                                    value={state?.progressRate ?? ""}
                                    onChange={(e) =>
                                      setRow(row.id, {
                                        progressRate: e.target.value,
                                      })
                                    }
                                    className="w-16 text-center"
                                  />
                                </div>
                              </TableCell>
                              <TableCell>
                                <Select
                                  value={state?.status}
                                  onValueChange={(v) =>
                                    setRow(row.id, { status: v as TaskStatus })
                                  }
                                >
                                  <SelectTrigger className="w-36 border-0 p-0 h-auto shadow-none focus:ring-0">
                                    <Badge
                                      className={cn(
                                        "cursor-pointer",
                                        state?.status
                                          ? STATUS_BADGE_CLASS[state.status]
                                          : ""
                                      )}
                                    >
                                      {state?.status
                                        ? TASK_STATUS_LABELS[state.status]
                                        : ""}
                                    </Badge>
                                  </SelectTrigger>
                                  <SelectContent>
                                    {TASK_STATUS_VALUES.map((s) => (
                                      <SelectItem key={s} value={s}>
                                        <Badge
                                          className={STATUS_BADGE_CLASS[s]}
                                        >
                                          {TASK_STATUS_LABELS[s]}
                                        </Badge>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                <Button
                                  size="sm"
                                  variant={isDirty ? "default" : "outline"}
                                  onClick={() => handleSaveSingle(row.id)}
                                  disabled={
                                    savingId === row.id || isBulkSaving
                                  }
                                >
                                  {savingId === row.id ? "保存中..." : "保存"}
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      )}
    </div>
  );
}
