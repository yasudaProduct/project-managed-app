"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { MonthPicker } from "@/components/month-picker";
import { Select } from "@/components/ui/select";
import { Loader2, Upload, Info, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface AvailableUser {
  userId: string;
  email: string;
  name: string;
}

interface ImportPreview {
  month: string;
  hasData: boolean;
  availableUsers: AvailableUser[];
  totalUsers: number;
}

export default function WorkRecordImportPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [importOptions, setImportOptions] = useState({
    month: "" as string | undefined,
    projectId: "" as string | undefined,
    userIds: [] as string[],
    dryRun: true,
    batchSize: 100,
  });
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleMonthChange = async (month: string) => {
    setImportOptions((prev) => ({ ...prev, month }));
    setPreview(null);
    setError(null);

    if (month && month.match(/^\d{4}-\d{2}$/)) {
      await checkAvailableData(month);
    }
  };

  const checkAvailableData = async (month: string) => {
    setChecking(true);
    setError(null);

    try {
      const response = await fetch(`/api/work-records/import?month=${month}`);
      const data = await response.json();

      if (data.success) {
        setPreview({
          month: data.month,
          hasData: data.hasData,
          availableUsers: data.availableUsers,
          totalUsers: data.totalUsers,
        });
      } else {
        setError(data.error || "月報データの確認に失敗しました");
      }
    } catch {
      setError("月報データの確認中にエラーが発生しました");
    } finally {
      setChecking(false);
    }
  };

  const handleUserSelection = (userId: string, checked: boolean) => {
    setImportOptions((prev) => ({
      ...prev,
      userIds: checked
        ? [...prev.userIds, userId]
        : prev.userIds.filter((id) => id !== userId),
    }));
  };

  const handleSelectAllUsers = (checked: boolean) => {
    setImportOptions((prev) => ({
      ...prev,
      userIds: checked
        ? preview?.availableUsers.map((u) => u.userId) || []
        : [],
    }));
  };

  const executeImport = async () => {
    if (!preview) return;

    setLoading(true);
    setError(null);

    try {
      //   if (data.success) {
      //     router.push(`/work-records/import/progress/${data.batchId}`);
      //   } else {
      //     setError(data.error || "取り込み処理の開始に失敗しました");
      //   }
    } catch {
      setError("取り込み処理中にエラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const canExecute =
    preview?.hasData && importOptions.month && !loading && !checking;

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">作業実績取り込み</h1>
        <p className="text-muted-foreground">
          月報システムから作業実績データを取り込みます
        </p>
      </div>

      <div className="space-y-6">
        {/* 基本設定 */}
        <Card>
          <CardHeader>
            <CardTitle>取り込み設定</CardTitle>
            <CardDescription>詳細オプションを設定してください</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="month">対象プロジェクト</Label>
                <Select
                  value={importOptions.projectId}
                  onValueChange={(value) =>
                    setImportOptions((prev) => ({
                      ...prev,
                      projectId: value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="month">対象月</Label>
                <MonthPicker
                  value={importOptions.month}
                  onChange={handleMonthChange}
                  placeholder="対象月を選択"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="dryRun"
                checked={importOptions.dryRun}
                onCheckedChange={(checked) =>
                  setImportOptions((prev) => ({
                    ...prev,
                    dryRun: checked as boolean,
                  }))
                }
              />
              <Label htmlFor="dryRun" className="text-sm">
                テスト実行（実際のデータは保存されません）
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* 月報データ確認結果 */}
        {checking && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>月報データを確認中...</span>
              </div>
            </CardContent>
          </Card>
        )}

        {preview && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Info className="h-5 w-5" />
                <span>月報データ確認結果</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">対象月:</span>
                <Badge variant="outline">{preview.month}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">データ有無:</span>
                <Badge variant={preview.hasData ? "default" : "destructive"}>
                  {preview.hasData ? "データあり" : "データなし"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">対象ユーザー数:</span>
                <Badge variant="secondary">{preview.totalUsers}人</Badge>
              </div>

              {preview.hasData && preview.availableUsers.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-medium">
                      取り込み対象ユーザー
                    </Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleSelectAllUsers(
                          importOptions.userIds.length !==
                            preview.availableUsers.length
                        )
                      }
                    >
                      {importOptions.userIds.length ===
                      preview.availableUsers.length
                        ? "全て解除"
                        : "全て選択"}
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-60 overflow-y-auto border rounded-md p-3">
                    {preview.availableUsers.map((user) => (
                      <div
                        key={user.userId}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          id={user.userId}
                          checked={importOptions.userIds.includes(user.userId)}
                          onCheckedChange={(checked) =>
                            handleUserSelection(user.userId, checked as boolean)
                          }
                        />
                        <Label
                          htmlFor={user.userId}
                          className="text-sm cursor-pointer"
                        >
                          {user.name} ({user.email})
                        </Label>
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {importOptions.userIds.length === 0
                      ? "全てのユーザーが対象になります"
                      : `${importOptions.userIds.length}人が選択されています`}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* エラー表示 */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* 実行ボタン */}
        <div className="flex justify-end space-x-4">
          <Button
            variant="outline"
            onClick={() => router.push("/work-records/import/history")}
          >
            取り込み履歴を見る
          </Button>
          <Button
            disabled={!canExecute}
            onClick={executeImport}
            className="min-w-32"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                実行中...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                {importOptions.dryRun ? "テスト実行" : "取り込み実行"}
              </>
            )}
          </Button>
        </div>

        {/* 注意事項 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">注意事項</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• 取り込み処理は時間がかかる場合があります</li>
              <li>• テスト実行では実際のデータは保存されません</li>
              <li>
                •
                同じ月のデータを複数回取り込むと重複データが作成される可能性があります
              </li>
              <li>
                •
                ユーザーを選択しない場合、全てのユーザーのデータが対象になります
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
