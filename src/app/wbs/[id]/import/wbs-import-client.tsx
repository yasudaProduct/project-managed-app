"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  ImportWizard,
  ImportProject,
  ImportValidation,
  ImportPreview,
  ImportResult,
} from "@/components/common/import-wizard/ImportWizard";
import { useState, useEffect } from "react";
import {
  executeWbsSync,
  getWbsSyncPreview,
  getWbsLastSync,
} from "@/app/wbs/[id]/import/excel-sync-action";

interface WbsImportClientProps {
  wbsId: number;
  projectId: string;
  projectName: string;
}

interface ValidationError {
  taskNo: string;
  field: string;
  message: string;
  value?: unknown;
  rowNumber?: number;
}

export function WbsImportClient({
  wbsId,
  projectId,
  projectName,
}: WbsImportClientProps) {
  const [lastSync, setLastSync] = useState<{
    syncedAt: string;
    recordCount: number;
    syncStatus: string;
  } | null>(null);

  useEffect(() => {
    // 最終同期情報の取得
    const fetchLastSync = async () => {
      try {
        const result = await getWbsLastSync(wbsId);
        if (result.success && result.data) {
          setLastSync({
            ...result.data,
            syncedAt:
              result.data.syncedAt instanceof Date
                ? result.data.syncedAt.toISOString()
                : result.data.syncedAt,
          });
        }
      } catch (error) {
        console.error("最終同期情報の取得に失敗しました:", error);
      }
    };
    fetchLastSync();
  }, [wbsId]);

  // プロジェクトロード処理（WBSの場合は単一プロジェクトのみ）
  const handleLoadProjects = async (): Promise<ImportProject[]> => {
    // WBSインポートの場合、すでにプロジェクトは決まっているので、そのまま返す
    return [
      {
        id: projectId,
        name: projectName,
        available: true,
        mappingStatus: "mapped",
      },
    ];
  };

  // バリデーション処理
  const handleValidate = async (): Promise<ImportValidation> => {
    try {
      const preview = await getWbsSyncPreview(wbsId);

      if (!preview.success || !preview.data) {
        return {
          isValid: false,
          errors: ["プレビュー取得に失敗しました"],
          warnings: [],
        };
      }

      const errors: string[] = [];
      const warnings: string[] = [];

      // バリデーションエラーをチェック
      if (
        preview.data.validationErrors &&
        preview.data.validationErrors.length > 0
      ) {
        preview.data.validationErrors.forEach((error: ValidationError) => {
          errors.push(
            `[Excel行${error.rowNumber || "不明"}] タスク${error.taskNo}: ${
              error.message
            }` +
              (error.value !== undefined ? ` (値: ${String(error.value)})` : "")
          );
        });
      }

      // 新規フェーズがある場合は警告
      if (preview.data.newPhases && preview.data.newPhases.length > 0) {
        warnings.push(
          `${preview.data.newPhases.length}個の新規フェーズが作成されます`
        );
      }

      // 新規ユーザーがある場合は警告
      if (preview.data.newUsers && preview.data.newUsers.length > 0) {
        warnings.push(
          `${preview.data.newUsers.length}人の新規ユーザーが作成されます`
        );
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        mappingInfo: {
          タスク: {
            totalCount:
              preview.data.toAdd +
              preview.data.toUpdate +
              preview.data.toDelete,
            mappedCount: preview.data.toAdd + preview.data.toUpdate,
            mappingRate:
              preview.data.toDelete > 0
                ? (preview.data.toAdd + preview.data.toUpdate) /
                  (preview.data.toAdd +
                    preview.data.toUpdate +
                    preview.data.toDelete)
                : 1,
          },
        },
      };
    } catch {
      return {
        isValid: false,
        errors: ["バリデーション中にエラーが発生しました"],
        warnings: [],
      };
    }
  };

  // プレビュー処理
  const handlePreview = async (): Promise<ImportPreview> => {
    const preview = await getWbsSyncPreview(wbsId);

    if (!preview.success || !preview.data) {
      throw new Error("プレビュー取得に失敗しました");
    }

    return {
      summary: {
        totalRecords: preview.data.toAdd + preview.data.toUpdate,
        toAdd: preview.data.toAdd,
        toUpdate: preview.data.toUpdate,
        toDelete: preview.data.toDelete,
      },
      sampleData: [
        ...preview.data.details.toAdd.slice(0, 5).map((item) => ({
          wbsId: item.wbsId,
          taskName: item.taskName,
          phase: item.phase,
          assignee: item.assignee,
          action: "新規追加",
        })),
        ...preview.data.details.toUpdate.slice(0, 5).map((item) => ({
          wbsId: item.wbsId,
          taskName: item.taskName,
          phase: item.phase,
          assignee: item.assignee,
          action: "更新",
        })),
      ],
      additionalInfo: {
        newPhases: preview.data.newPhases,
        newUsers: preview.data.newUsers,
        toDelete: preview.data.details.toDelete,
      },
    };
  };

  // インポート実行処理
  const handleExecute = async (): Promise<ImportResult> => {
    const result = await executeWbsSync(wbsId, "replace");

    if (!result.success || !result.data) {
      throw new Error("同期実行に失敗しました");
    }

    return {
      successCount: result.data.recordCount,
      createdCount: result.data.addedCount,
      updatedCount: result.data.updatedCount,
      errorCount: 0,
      errors: result.data.errorDetails
        ? [
            {
              recordId: undefined,
              message: String(
                result.data.errorDetails.message || "エラーが発生しました"
              ),
              details: result.data.errorDetails,
            },
          ]
        : [],
    };
  };

  // 追加の設定コンポーネント
  const additionalSettings = (
    <>
      <Alert>
        <AlertTitle>ExcelからのWBSインポートについて</AlertTitle>
        <AlertDescription>
          ExcelファイルからWBSデータを一方向同期します。
          Excel側のデータがマスターとなり、アプリケーション側のデータは上書きされます。
        </AlertDescription>
      </Alert>

      {lastSync && lastSync.syncStatus === "SUCCESS" && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium">最終同期</h3>
          <p className="text-sm text-muted-foreground">
            {new Date(lastSync.syncedAt).toLocaleString("ja-JP")} -{" "}
            {lastSync.recordCount}件
          </p>
        </div>
      )}
    </>
  );

  // カスタムプレビューレンダラー
  const previewRenderer = (preview: ImportPreview) => (
    <>
      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="space-y-1">
          <p className="text-2xl font-bold text-green-600">
            {preview.summary.toAdd || 0}
          </p>
          <p className="text-sm text-muted-foreground">新規追加</p>
        </div>
        <div className="space-y-1">
          <p className="text-2xl font-bold text-blue-600">
            {preview.summary.toUpdate || 0}
          </p>
          <p className="text-sm text-muted-foreground">更新</p>
        </div>
        <div className="space-y-1">
          <p className="text-2xl font-bold text-red-600">
            {preview.summary.toDelete || 0}
          </p>
          <p className="text-sm text-muted-foreground">削除</p>
        </div>
      </div>

      {preview.sampleData && preview.sampleData.length > 0 && (
        <div className="border-t pt-4">
          <details className="space-y-2">
            <summary className="cursor-pointer text-sm font-medium">
              詳細を表示
            </summary>
            <div className="space-y-4 mt-2">
              <div>
                <h4 className="text-sm font-medium mb-2">
                  変更されるタスク（最初の10件）
                </h4>
                <div className="space-y-1">
                  {preview.sampleData.slice(0, 10).map((item, index) => {
                    const typedItem = item as {
                      action: string;
                      wbsId: string;
                      taskName: string;
                      phase: string;
                      assignee: string | null;
                    };
                    return (
                      <p key={index} className="text-sm text-muted-foreground">
                        • [{typedItem.action}] {typedItem.wbsId}:{" "}
                        {typedItem.taskName} ({typedItem.phase})
                      </p>
                    );
                  })}
                </div>
              </div>
            </div>
          </details>
        </div>
      )}

      {/* 新規作成されるデータの表示 */}
      {preview.additionalInfo?.newPhases &&
        Array.isArray(preview.additionalInfo.newPhases) &&
        preview.additionalInfo.newPhases.length > 0 && (
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium mb-2">新規作成されるフェーズ</h4>
            <div className="space-y-1">
              {(
                preview.additionalInfo.newPhases as Array<{
                  name: string;
                  code: string;
                }>
              ).map((phase, index) => (
                <p key={index} className="text-sm text-muted-foreground">
                  • {phase.name} (コード: {phase.code})
                </p>
              ))}
            </div>
          </div>
        )}

      {preview.additionalInfo?.newUsers &&
        Array.isArray(preview.additionalInfo.newUsers) &&
        preview.additionalInfo.newUsers.length > 0 && (
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium mb-2">新規作成されるユーザー</h4>
            <div className="space-y-1">
              {(
                preview.additionalInfo.newUsers as Array<{
                  name: string;
                  email: string;
                }>
              ).map((user, index) => (
                <p key={index} className="text-sm text-muted-foreground">
                  • {user.name} ({user.email})
                </p>
              ))}
            </div>
          </div>
        )}
    </>
  );

  // カスタムバリデーションレンダラー
  const validationRenderer = (validation: ImportValidation) => (
    <>
      {validation.errors.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-semibold text-destructive">エラー</h4>
          <Alert variant="destructive">
            <AlertTitle>バリデーションエラー</AlertTitle>
            <AlertDescription>
              <p className="mb-2">
                以下のタスクでエラーが検出されました。フェーズ、ユーザー、担当者が存在しない場合は、既存の登録画面から作成してから再度実行してください。
              </p>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {validation.errors.map((error, index) => (
                  <p key={index} className="text-sm">
                    • {error}
                  </p>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {validation.warnings.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-semibold text-yellow-600">警告</h4>
          {validation.warnings.map((warning, index) => (
            <Alert key={index}>
              <AlertDescription>{warning}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {validation.mappingInfo && (
        <div className="grid grid-cols-1 gap-4">
          {Object.entries(validation.mappingInfo).map(([key, info]) => (
            <div key={key} className="border rounded-lg p-4">
              <h4 className="text-sm font-medium mb-2">{key}マッピング</h4>
              <div className="text-2xl font-bold">
                {Math.round(info.mappingRate * 100)}%
              </div>
              <div className="text-sm text-muted-foreground">
                {info.mappedCount}/{info.totalCount} 件
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );

  return (
    <ImportWizard
      title="Excel → WBS 同期"
      description={`プロジェクト: ${projectName}`}
      onLoadProjects={handleLoadProjects}
      projectSelectionMode="single"
      onValidate={handleValidate}
      onPreview={handlePreview}
      onExecute={handleExecute}
      additionalSettings={additionalSettings}
      previewRenderer={previewRenderer}
      validationRenderer={validationRenderer}
    />
  );
}
