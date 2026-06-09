"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { TaskStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
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

type Props = {
  wbsId: number;
  wbsName: string;
  snapshots: EditableProgressSnapshotData[];
};

// snapshotAt（ISO 8601 / UTC）をユーザーTZで整形
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

  // 行ごとの編集状態（progressRate は入力中の文字列、status は enum）
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

  // タスク（taskNo）単位でグルーピング
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

  const setRow = (
    id: number,
    patch: Partial<{ progressRate: string; status: TaskStatus }>
  ) => {
    setRowState((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  const handleSave = async (id: number) => {
    const state = rowState[id];
    if (!state) return;

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
        return;
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
        toast({ title: "保存しました" });
        router.refresh();
      } else {
        toast({
          title: "保存に失敗しました",
          description: result.error,
          variant: "destructive",
        });
      }
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">進捗履歴の訂正</h1>
        <p className="text-gray-600 mt-1">{wbsName}</p>
        <p className="text-sm text-gray-500 mt-2">
          各同期時点に記録された進捗率・ステータスを訂正できます。訂正は過去のEVMにも反映されます。
        </p>
      </div>

      {groups.length === 0 ? (
        <p className="text-gray-500">
          訂正対象のスナップショットがありません。WBSを同期すると履歴が蓄積されます。
        </p>
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <div key={group.taskNo}>
              <h2 className="text-lg font-semibold mb-2">
                {group.taskNo} {group.taskName}
              </h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">記録時点</TableHead>
                    <TableHead className="w-[140px]">進捗率(%)</TableHead>
                    <TableHead className="w-[160px]">ステータス</TableHead>
                    <TableHead className="w-[100px]">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.rows.map((row) => {
                    const state = rowState[row.id];
                    return (
                      <TableRow key={row.id}>
                        <TableCell>{formatSnapshotAt(row.snapshotAt)}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={state?.progressRate ?? ""}
                            onChange={(e) =>
                              setRow(row.id, { progressRate: e.target.value })
                            }
                            className="w-24"
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={state?.status}
                            onValueChange={(v) =>
                              setRow(row.id, { status: v as TaskStatus })
                            }
                          >
                            <SelectTrigger className="w-36">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {TASK_STATUS_VALUES.map((s) => (
                                <SelectItem key={s} value={s}>
                                  {TASK_STATUS_LABELS[s]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            onClick={() => handleSave(row.id)}
                            disabled={savingId === row.id}
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
          ))}
        </div>
      )}
    </div>
  );
}
