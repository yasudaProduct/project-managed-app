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
import {
  Loader2,
  Play,
  XCircle,
  RefreshCcw,
  Radio,
  AlertCircle,
} from "lucide-react";
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
  errorDetails?: Record<string, unknown>;
  result?: Record<string, unknown>;
};

type GeppoImportError = {
  memberId: string;
  projectId?: string;
  date: string;
  errorType:
    | "USER_NOT_FOUND"
    | "PROJECT_NOT_FOUND"
    | "TASK_NOT_FOUND"
    | "INVALID_DATA"
    | "DB_ERROR";
  message: string;
  originalData?: unknown;
};

type GeppoImportValidation = {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  userMapping: Record<string, unknown>;
  projectMapping: Record<string, unknown>;
  taskMapping: Record<string, unknown>;
  statistics: Record<string, unknown>;
};

export default function ImportJobsClient() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [subscribingJobId, setSubscribingJobId] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

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

  const statusBadge = (job: Job) => {
    const { status } = job;
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

    const hasErrors =
      job.errorCount > 0 ||
      job.errorDetails ||
      (job.result as GeppoImportValidation)?.errors?.length > 0;
    const isClickable =
      (status === "FAILED" || status === "COMPLETED") && hasErrors;

    return (
      <Badge
        className={`${color} rounded ${
          isClickable ? "cursor-pointer hover:opacity-80" : ""
        }`}
        onClick={isClickable ? () => toggleRowExpansion(job.id) : undefined}
      >
        {statusName(status)}
      </Badge>
    );
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

  const toggleRowExpansion = (jobId: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(jobId)) {
        newSet.delete(jobId);
      } else {
        newSet.add(jobId);
      }
      return newSet;
    });
  };

  // エラー詳細をレンダリング
  const renderErrorDetails = (job: Job) => {
    if (!job.errorDetails && !job.result) return null;

    const validation = job.result as GeppoImportValidation | undefined;
    const errors = job.errorDetails as
      | { errors?: GeppoImportError[] }
      | undefined;

    return (
      <div className="p-4 bg-gray-50 border-t">
        {validation && !validation.isValid && (
          <div className="mb-4">
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              バリデーションエラー
            </h4>
            {validation.errors.length > 0 && (
              <div className="mb-2">
                <p className="text-sm font-medium text-red-600 mb-1">エラー:</p>
                <ul className="list-disc list-inside text-sm text-red-600 space-y-1">
                  {validation.errors.map((error, idx) => (
                    <li key={idx}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
            {validation.warnings.length > 0 && (
              <div>
                <p className="text-sm font-medium text-yellow-600 mb-1">
                  警告:
                </p>
                <ul className="list-disc list-inside text-sm text-yellow-600 space-y-1">
                  {validation.warnings.map((warning, idx) => (
                    <li key={idx}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {errors?.errors && errors.errors.length > 0 && (
          <div>
            <h4 className="font-semibold text-sm mb-2">実行時エラー詳細</h4>
            <div className="max-h-60 overflow-y-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-1 px-2">メンバーID</th>
                    <th className="text-left py-1 px-2">日付</th>
                    <th className="text-left py-1 px-2">エラータイプ</th>
                    <th className="text-left py-1 px-2">メッセージ</th>
                  </tr>
                </thead>
                <tbody>
                  {(errors.errors as GeppoImportError[]).map((error, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="py-1 px-2">{error.memberId}</td>
                      <td className="py-1 px-2">{error.date}</td>
                      <td className="py-1 px-2">
                        <Badge variant="outline" className="text-xs">
                          {error.errorType}
                        </Badge>
                      </td>
                      <td className="py-1 px-2">{error.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {job.errorDetails && !errors?.errors && (
          <div>
            <h4 className="font-semibold text-sm mb-2">エラー詳細</h4>
            <pre className="text-xs bg-white p-2 rounded border overflow-x-auto">
              {JSON.stringify(job.errorDetails, null, 2)}
            </pre>
          </div>
        )}
      </div>
    );
  };

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
                jobs.map((job) => {
                  const isExpanded = expandedRows.has(job.id);

                  return (
                    <>
                      <TableRow key={job.id}>
                        <TableCell className="font-mono text-xs">
                          {job.wbsName || job.wbsId
                            ? `${job.wbsName ?? job.wbsId}`
                            : ""}
                        </TableCell>
                        <TableCell>{job.type}</TableCell>
                        <TableCell>{statusBadge(job)}</TableCell>
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
                      {isExpanded && (
                        <TableRow>
                          <TableCell colSpan={columns.length} className="p-0">
                            {renderErrorDetails(job)}
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
