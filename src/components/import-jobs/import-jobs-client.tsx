"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Play, XCircle, RefreshCcw, Radio } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Job = {
  id: string;
  type: "GEPPO" | "WBS";
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";
  totalRecords: number;
  processedRecords: number;
  successCount: number;
  errorCount: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  targetMonth?: string | null;
  wbsId?: number | null;
  wbsName?: string | null;
};

export default function ImportJobsClient() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [subscribingJobId, setSubscribingJobId] = useState<string | null>(null);

  const fetchJobs = async () => {
    setLoading(true);

    try {
      const res = await fetch(`/api/import-jobs`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setJobs(data as Job[]);
      } else {
        console.log(res.statusText);
        toast({
          title: "エラー",
          description: res.statusText,
          variant: "destructive",
        });
        console.error(res.statusText);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  // SSEで状態を購読
  useEffect(() => {
    if (!subscribingJobId) return;
    const eventSource = new EventSource(
      `/api/import-jobs/${subscribingJobId}/stream`
    );
    eventSource.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.type === "job_update" && payload.job) {
          setJobs((prev) =>
            prev.map((j) =>
              j.id === subscribingJobId ? { ...j, ...payload.job } : j
            )
          );
        }
      } catch {}
    };
    eventSource.onerror = () => {
      eventSource.close();
    };
    return () => eventSource.close();
  }, [subscribingJobId]);

  const statusBadge = (status: Job["status"]) => {
    const color =
      status === "COMPLETED"
        ? "bg-green-100 text-green-700"
        : status === "FAILED"
        ? "bg-red-100 text-red-700"
        : status === "RUNNING"
        ? "bg-blue-100 text-blue-700"
        : status === "CANCELLED"
        ? "bg-gray-100 text-gray-700"
        : "bg-yellow-100 text-yellow-700";
    return <Badge className={`${color} rounded`}>{statusName(status)}</Badge>;
  };

  const statusName = (status: Job["status"]) => {
    return status === "COMPLETED"
      ? "完了"
      : status === "FAILED"
      ? "失敗"
      : status === "RUNNING"
      ? "実行中"
      : status === "CANCELLED"
      ? "キャンセル"
      : status === "PENDING"
      ? "実行待ち"
      : "不明";
  };

  const startJob = async (id: string) => {
    const res = await fetch(`/api/import-jobs/${id}/execute`, {
      method: "POST",
    });
    if (res.ok) {
      setSubscribingJobId(id);
      fetchJobs();
    }
  };

  const cancelJob = async (id: string) => {
    await fetch(`/api/import-jobs/${id}/cancel`, { method: "POST" });
    fetchJobs();
  };

  const columns = useMemo(
    () => [
      { key: "target", label: "対象" },
      { key: "type", label: "種別" },
      { key: "status", label: "状態" },
      { key: "progress", label: "進捗" },
      { key: "createdAt", label: "作成" },
      { key: "startedAt", label: "開始" },
      { key: "completedAt", label: "完了" },
      { key: "actions", label: "操作" },
    ],
    []
  );

  return (
    <Card className="rounded-none shadow-none">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">インポートジョブ</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchJobs}>
              <RefreshCcw className="h-4 w-4" />
              更新
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                {columns.map((col) => (
                  <TableHead key={col.key} className="font-semibold">
                    {col.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="text-center text-gray-500 py-6"
                  >
                    <Loader2 className="inline h-4 w-4 animate-spin" />{" "}
                    読み込み中...
                  </TableCell>
                </TableRow>
              ) : jobs.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="text-center text-gray-500 py-6"
                  >
                    ジョブがありません
                  </TableCell>
                </TableRow>
              ) : (
                jobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="font-mono text-xs">
                      {job.type === "GEPPO" && job.targetMonth
                        ? `月報: ${job.targetMonth}`
                        : ""}
                      {job.type === "WBS" && (job.wbsName || job.wbsId)
                        ? `${job.wbsName ?? job.wbsId}`
                        : ""}
                    </TableCell>
                    <TableCell>{job.type}</TableCell>
                    <TableCell>{statusBadge(job.status)}</TableCell>
                    <TableCell>
                      {job.totalRecords > 0
                        ? `${job.processedRecords}/${job.totalRecords} 成功:${job.successCount} エラー:${job.errorCount}`
                        : job.status === "RUNNING"
                        ? "実行中..."
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {new Date(job.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {job.startedAt
                        ? new Date(job.startedAt).toLocaleString()
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {job.completedAt
                        ? new Date(job.completedAt).toLocaleString()
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {job.status === "PENDING" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => startJob(job.id)}
                          >
                            <Play className="h-4 w-4" /> 実行
                          </Button>
                        )}
                        {job.status === "RUNNING" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSubscribingJobId(job.id)}
                          >
                            <Radio className="h-4 w-4" /> 監視
                          </Button>
                        )}
                        {(job.status === "PENDING" ||
                          job.status === "RUNNING") && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => cancelJob(job.id)}
                          >
                            <XCircle className="h-4 w-4" /> キャンセル
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
