"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Upload,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import {
  executeWbsSync,
  getWbsSyncPreview,
  getWbsSyncHistory,
  getWbsLastSync,
} from "@/app/wbs/[id]/import/excel-sync-action";

interface SyncHistory {
  id: number;
  syncedAt: string;
  syncStatus: string;
  recordCount: number;
  addedCount: number;
  updatedCount: number;
  deletedCount: number;
  errorDetails?: Record<string, unknown>;
}

interface ValidationError {
  taskNo: string;
  field: string;
  message: string;
  value?: unknown;
  rowNumber?: number; // Excel行番号
}

interface SyncPreview {
  toAdd: number;
  toUpdate: number;
  toDelete: number;
  details: {
    toAdd: Array<{
      wbsId: string;
      taskName: string;
      phase: string;
      assignee: string | null;
    }>;
    toUpdate: Array<{
      wbsId: string;
      taskName: string;
      phase: string;
      assignee: string | null;
    }>;
    toDelete: string[];
  };
  validationErrors?: ValidationError[];
  newPhases?: Array<{ name: string; code: string }>;
  newUsers?: Array<{ name: string; email: string }>;
}

interface WbsSyncClientProps {
  wbsId: number;
  projectName: string;
}

export function WbsSyncClient({ wbsId, projectName }: WbsSyncClientProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [syncHistory, setSyncHistory] = useState<SyncHistory[]>([]);
  const [syncPreview, setSyncPreview] = useState<SyncPreview | null>(null);
  const [lastSync, setLastSync] = useState<SyncHistory | null>(null);
  const [syncMode, setSyncMode] = useState<"sync" | "replace">("replace");

  // SyncLogをSyncHistoryに変換する関数
  const convertSyncLogToSyncHistory = (syncLog: {
    id: number;
    syncedAt: Date | string;
    syncStatus: string;
    recordCount: number;
    addedCount: number;
    updatedCount: number;
    deletedCount: number;
    errorDetails?: Record<string, unknown>;
  }): SyncHistory => ({
    id: syncLog.id,
    syncedAt:
      syncLog.syncedAt instanceof Date
        ? syncLog.syncedAt.toISOString()
        : syncLog.syncedAt,
    syncStatus: syncLog.syncStatus,
    recordCount: syncLog.recordCount,
    addedCount: syncLog.addedCount,
    updatedCount: syncLog.updatedCount,
    deletedCount: syncLog.deletedCount,
    errorDetails: syncLog.errorDetails,
  });

  const fetchSyncHistory = useCallback(async () => {
    try {
      const result = await getWbsSyncHistory(wbsId, 10);
      if (result.success) {
        const convertedHistory = result.data.map(convertSyncLogToSyncHistory);
        setSyncHistory(convertedHistory);
      }
    } catch (_error) {
      console.error("同期履歴の取得に失敗しました:", _error);
    }
  }, [wbsId]);

  const fetchLastSync = useCallback(async () => {
    try {
      const result = await getWbsLastSync(wbsId);
      if (result.success && result.data) {
        const convertedLastSync = convertSyncLogToSyncHistory(result.data);
        setLastSync(convertedLastSync);
      }
    } catch (_error) {
      console.error("最終同期情報の取得に失敗しました:", _error);
    }
  }, [wbsId]);

  useEffect(() => {
    // 同期履歴を取得
    fetchSyncHistory();
    // 最終同期情報を取得
    fetchLastSync();
  }, [wbsId, fetchSyncHistory, fetchLastSync]);

  const handlePreview = async () => {
    setIsPreviewing(true);
    try {
      const result = await getWbsSyncPreview(wbsId);
      if (result.success) {
        setSyncPreview(result.data);
      }
    } catch {
      toast({
        title: "エラー",
        description: "プレビューの取得中にエラーが発生しました",
        variant: "destructive",
      });
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleSync = async () => {
    setIsLoading(true);
    try {
      const result = await executeWbsSync(wbsId, syncMode);

      if (result.success) {
        toast({
          title: syncMode === "replace" ? "洗い替え完了" : "同期完了",
          description: `${result.data.recordCount}件のレコードを${
            syncMode === "replace" ? "洗い替え" : "同期"
          }しました。（追加: ${result.data.addedCount}件、更新: ${
            result.data.updatedCount
          }件、削除: ${result.data.deletedCount}件）`,
        });

        // 同期履歴を再取得
        fetchSyncHistory();
        fetchLastSync();
        setSyncPreview(null);
      }
    } catch (error) {
      toast({
        title: "エラー",
        description:
          error instanceof Error
            ? error.message
            : "同期中にエラーが発生しました",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "SUCCESS":
        return <Badge className="bg-green-500">成功</Badge>;
      case "PARTIAL":
        return <Badge className="bg-yellow-500">部分的成功</Badge>;
      case "FAILED":
        return <Badge className="bg-red-500">失敗</Badge>;
      default:
        return <Badge variant="secondary">不明</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "SUCCESS":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "PARTIAL":
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case "FAILED":
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <Tabs defaultValue="sync" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="sync">同期実行</TabsTrigger>
        <TabsTrigger value="history">同期履歴</TabsTrigger>
      </TabsList>

      <TabsContent value="sync" className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>同期について</AlertTitle>
          <AlertDescription>
            ExcelファイルからWBSデータを一方向同期します。
            Excel側のデータがマスターとなり、アプリケーション側のデータは上書きされます。
          </AlertDescription>
        </Alert>

        {/* 同期モードの選択 */}
        <Card>
          <CardHeader>
            <CardTitle>同期モード</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="syncMode"
                  value="sync"
                  checked={syncMode === "sync"}
                  onChange={() => setSyncMode("sync")}
                  className="w-4 h-4"
                />
                <div className="flex-1">
                  <p className="font-medium">差分同期</p>
                  <p className="text-sm text-muted-foreground">
                    変更があったタスクのみを更新します
                  </p>
                </div>
              </label> */}
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="syncMode"
                  value="replace"
                  checked={syncMode === "replace"}
                  onChange={() => setSyncMode("replace")}
                  className="w-4 h-4"
                />
                <div className="flex-1">
                  <p className="font-medium">洗い替え</p>
                  <p className="text-sm text-muted-foreground">
                    既存データを全て削除してから、Excelのデータを再インポートします
                  </p>
                </div>
              </label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>同期設定</CardTitle>
            <CardDescription>プロジェクト名: {projectName}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">最終同期</h3>
              {lastSync && lastSync.syncStatus === "SUCCESS" ? (
                <p className="text-sm text-muted-foreground">
                  {new Date(lastSync.syncedAt).toLocaleString("ja-JP")} -{" "}
                  {lastSync.recordCount}件
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">未実行</p>
              )}
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={handlePreview}
                disabled={isPreviewing || isLoading}
              >
                {isPreviewing && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                プレビュー
              </Button>
              <Button
                onClick={handleSync}
                disabled={
                  isLoading ||
                  (syncPreview?.validationErrors &&
                    syncPreview.validationErrors.length > 0)
                }
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : syncMode === "replace" ? (
                  <RefreshCw className="h-4 w-4 mr-2" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                {syncMode === "replace" ? "洗い替えを実行" : "同期を実行"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {syncPreview && (
          <Card>
            <CardHeader>
              <CardTitle>同期プレビュー</CardTitle>
              <CardDescription>同期実行時の変更内容</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-green-600">
                    {syncPreview.toAdd}
                  </p>
                  <p className="text-sm text-muted-foreground">新規追加</p>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-blue-600">
                    {syncPreview.toUpdate}
                  </p>
                  <p className="text-sm text-muted-foreground">更新</p>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-red-600">
                    {syncPreview.toDelete}
                  </p>
                  <p className="text-sm text-muted-foreground">削除</p>
                </div>
              </div>

              {(syncPreview.toAdd > 0 ||
                syncPreview.toUpdate > 0 ||
                syncPreview.toDelete > 0) && (
                <div className="border-t pt-4">
                  <details className="space-y-2">
                    <summary className="cursor-pointer text-sm font-medium">
                      詳細を表示
                    </summary>
                    <div className="space-y-4 mt-2">
                      {syncPreview.details.toAdd.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium mb-2">新規追加</h4>
                          <div className="space-y-1">
                            {syncPreview.details.toAdd
                              .slice(0, 5)
                              .map((item, index) => (
                                <p
                                  key={index}
                                  className="text-sm text-muted-foreground"
                                >
                                  • {item.wbsId}: {item.taskName} ({item.phase})
                                </p>
                              ))}
                            {syncPreview.details.toAdd.length > 5 && (
                              <p className="text-sm text-muted-foreground">
                                ...他{syncPreview.details.toAdd.length - 5}件
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {syncPreview.details.toUpdate.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium mb-2">更新</h4>
                          <div className="space-y-1">
                            {syncPreview.details.toUpdate
                              .slice(0, 5)
                              .map((item, index) => (
                                <p
                                  key={index}
                                  className="text-sm text-muted-foreground"
                                >
                                  • {item.wbsId}: {item.taskName} ({item.phase})
                                </p>
                              ))}
                            {syncPreview.details.toUpdate.length > 5 && (
                              <p className="text-sm text-muted-foreground">
                                ...他{syncPreview.details.toUpdate.length - 5}件
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {syncPreview.details.toDelete.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium mb-2">削除</h4>
                          <div className="space-y-1">
                            {syncPreview.details.toDelete
                              .slice(0, 5)
                              .map((id, index) => (
                                <p
                                  key={index}
                                  className="text-sm text-muted-foreground"
                                >
                                  • {id}
                                </p>
                              ))}
                            {syncPreview.details.toDelete.length > 5 && (
                              <p className="text-sm text-muted-foreground">
                                ...他{syncPreview.details.toDelete.length - 5}件
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </details>
                </div>
              )}

              {/* バリデーションエラーの表示 */}
              {syncPreview.validationErrors &&
                syncPreview.validationErrors.length > 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>バリデーションエラー</AlertTitle>
                    <AlertDescription>
                      <p className="mb-2">
                        以下のタスクでエラーが検出されました。フェーズ、ユーザー、担当者が存在しない場合は、既存の登録画面から作成してから再度実行してください。
                      </p>
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {syncPreview.validationErrors.map((error, index) => (
                          <p key={index} className="text-sm">
                            • {error.rowNumber ? `[Excel行${error.rowNumber}] ` : ''}{error.taskNo}: {error.message}
                            {error.value !== undefined &&
                              ` (値: ${String(error.value)})`}
                          </p>
                        ))}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

              {/* 新規作成されるデータの表示 */}
              {syncPreview.newPhases && syncPreview.newPhases.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium mb-2">
                    新規作成されるフェーズ
                  </h4>
                  <div className="space-y-1">
                    {syncPreview.newPhases.map((phase, index) => (
                      <p key={index} className="text-sm text-muted-foreground">
                        • {phase.name} (コード: {phase.code})
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {syncPreview.newUsers && syncPreview.newUsers.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium mb-2">
                    新規作成されるユーザー
                  </h4>
                  <div className="space-y-1">
                    {syncPreview.newUsers.map((user, index) => (
                      <p key={index} className="text-sm text-muted-foreground">
                        • {user.name} ({user.email})
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="history" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>同期履歴</CardTitle>
            <CardDescription>過去の同期実行結果を確認できます</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {syncHistory.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  まだ同期履歴がありません
                </p>
              ) : (
                syncHistory.map((history) => (
                  <div
                    key={history.id}
                    className="flex items-start space-x-3 p-4 border rounded-lg"
                  >
                    {getStatusIcon(history.syncStatus)}
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">
                          {new Date(history.syncedAt).toLocaleString("ja-JP")}
                        </p>
                        {getStatusBadge(history.syncStatus)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {(history.syncStatus === "SUCCESS" ||
                          history.syncStatus === "PARTIAL") && (
                          <p>
                            レコード数: {history.recordCount}件 （追加:{" "}
                            {history.addedCount}件、更新: {history.updatedCount}
                            件、削除: {history.deletedCount}件）
                          </p>
                        )}
                        {history.errorDetails && (
                          <p className="text-red-500 mt-1">
                            {history.errorDetails.message as string}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
