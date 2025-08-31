"use client";

import React, { useState } from "react";
import { Bell, Smartphone, Clock, TestTube, RotateCcw } from "lucide-react";
import { useNotificationPreferences } from "@/hooks/useNotificationPreferences";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export function NotificationSettings() {
  const {
    preferences,
    isLoading,
    updatePreferences,
    resetToDefaults,
    validateQuietHours,
    updateState,
  } = useNotificationPreferences();

  const {
    permission,
    isSubscribed,
    isSupported,
    subscribe,
    unsubscribe,
    sendTestNotification,
    isLoading: pushLoading,
    error: pushError,
  } = usePushNotifications();

  const [localQuietStart, setLocalQuietStart] = useState<string>(
    preferences?.quietHoursStart?.toString().padStart(2, "0") || ""
  );
  const [localQuietEnd, setLocalQuietEnd] = useState<string>(
    preferences?.quietHoursEnd?.toString().padStart(2, "0") || ""
  );

  if (isLoading) {
    return <div>設定を読み込み中...</div>;
  }

  if (!preferences) {
    return <div>設定を読み込めませんでした</div>;
  }

  const handleToggle = (field: keyof typeof preferences, value: boolean) => {
    updatePreferences({ [field]: value });
  };

  const handleDeadlineDaysChange = (days: number[]) => {
    updatePreferences({ taskDeadline: { days } });
  };

  const handleManhourThresholdsChange = (percentages: number[]) => {
    updatePreferences({ manhourThreshold: { percentages } });
  };

  const handleQuietHoursUpdate = () => {
    const start = localQuietStart ? parseInt(localQuietStart) : undefined;
    const end = localQuietEnd ? parseInt(localQuietEnd) : undefined;

    if (validateQuietHours(start, end)) {
      updatePreferences({
        quietHoursStart: start,
        quietHoursEnd: end,
      });
    }
  };

  const handlePushToggle = async () => {
    try {
      if (isSubscribed) {
        await unsubscribe();
      } else {
        await subscribe();
      }
    } catch (error) {
      console.error("Push notification toggle failed:", error);
    }
  };

  const handleTestNotification = async () => {
    try {
      await sendTestNotification();
    } catch (error) {
      console.error("Test notification failed:", error);
    }
  };

  const getPushStatusBadge = () => {
    if (!isSupported) {
      return <Badge variant="secondary">非対応</Badge>;
    }

    switch (permission) {
      case "granted":
        return isSubscribed ? (
          <Badge variant="default">有効</Badge>
        ) : (
          <Badge variant="secondary">無効</Badge>
        );
      case "denied":
        return <Badge variant="destructive">拒否済み</Badge>;
      default:
        return <Badge variant="outline">未設定</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold">通知設定</h2>
        <p className="text-gray-600 mt-1">
          プロジェクト管理に関する通知の受信設定を管理できます。
        </p>
      </div>

      {/* Push通知設定 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Smartphone size={20} />
                デスクトップ通知
              </CardTitle>
              <CardDescription>
                ブラウザのプッシュ通知でリアルタイムにお知らせします
              </CardDescription>
            </div>
            {getPushStatusBadge()}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isSupported && (
            <Alert>
              <AlertDescription>
                このブラウザではプッシュ通知がサポートされていません。
              </AlertDescription>
            </Alert>
          )}

          {pushError && (
            <Alert variant="destructive">
              <AlertDescription>{pushError}</AlertDescription>
            </Alert>
          )}

          {permission === "denied" && (
            <Alert variant="destructive">
              <AlertDescription>
                通知が拒否されています。ブラウザの設定で通知を許可してください。
              </AlertDescription>
            </Alert>
          )}

          <div className="flex items-center justify-between">
            <div>
              <Label>プッシュ通知を有効にする</Label>
              <p className="text-sm text-gray-500">
                ブラウザを閉じていても通知を受信できます
              </p>
            </div>
            <Switch
              checked={isSubscribed}
              onCheckedChange={handlePushToggle}
              disabled={!isSupported || permission === "denied" || pushLoading}
            />
          </div>

          {isSubscribed && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestNotification}
                disabled={pushLoading}
              >
                <TestTube size={16} className="mr-2" />
                テスト通知を送信
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 通知チャネル設定 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell size={20} />
            通知チャネル
          </CardTitle>
          <CardDescription>
            どの方法で通知を受信するかを選択できます
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>アプリ内通知</Label>
              <p className="text-sm text-gray-500">
                アプリケーション内の通知センターに表示
              </p>
            </div>
            <Switch
              checked={preferences.enableInApp}
              onCheckedChange={(checked) =>
                handleToggle("enableInApp", checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>メール通知</Label>
              <p className="text-sm text-gray-500">
                重要な通知をメールで受信（今後実装予定）
              </p>
            </div>
            <Switch
              checked={preferences.enableEmail}
              onCheckedChange={(checked) =>
                handleToggle("enableEmail", checked)
              }
              disabled={true}
            />
          </div>
        </CardContent>
      </Card>

      {/* 通知タイプ別設定 */}
      <Card>
        <CardHeader>
          <CardTitle>通知内容の設定</CardTitle>
          <CardDescription>
            どのようなイベントで通知を受信するかを設定できます
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* タスク期限通知 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>タスク期限通知</Label>
              <Switch
                checked={preferences.taskDeadline.days.length > 0}
                onCheckedChange={(checked) =>
                  handleDeadlineDaysChange(checked ? [3, 1, 0] : [])
                }
              />
            </div>

            {preferences.taskDeadline.days.length > 0 && (
              <div className="ml-4 space-y-2">
                <p className="text-sm text-gray-600">
                  通知タイミング（期限前の日数）
                </p>
                <div className="flex flex-wrap gap-2">
                  {[7, 3, 1, 0].map((day) => (
                    <div key={day} className="flex items-center space-x-2">
                      <Checkbox
                        id={`deadline-${day}`}
                        checked={preferences.taskDeadline.days.includes(day)}
                        onCheckedChange={(checked) => {
                          const currentDays = preferences.taskDeadline.days;
                          const newDays = checked
                            ? [...currentDays, day].sort((a, b) => b - a)
                            : currentDays.filter((d) => d !== day);
                          handleDeadlineDaysChange(newDays);
                        }}
                      />
                      <Label htmlFor={`deadline-${day}`} className="text-sm">
                        {day === 0 ? "当日" : `${day}日前`}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* 工数超過通知 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>工数超過通知</Label>
              <Switch
                checked={preferences.manhourThreshold.percentages.length > 0}
                onCheckedChange={(checked) =>
                  handleManhourThresholdsChange(checked ? [80, 100, 120] : [])
                }
              />
            </div>

            {preferences.manhourThreshold.percentages.length > 0 && (
              <div className="ml-4 space-y-2">
                <p className="text-sm text-gray-600">
                  通知タイミング（予定工数に対する割合）
                </p>
                <div className="flex flex-wrap gap-2">
                  {[50, 80, 100, 120, 150].map((percentage) => (
                    <div
                      key={percentage}
                      className="flex items-center space-x-2"
                    >
                      <Checkbox
                        id={`manhour-${percentage}`}
                        checked={preferences.manhourThreshold.percentages.includes(
                          percentage
                        )}
                        onCheckedChange={(checked) => {
                          const current =
                            preferences.manhourThreshold.percentages;
                          const newPercentages = checked
                            ? [...current, percentage].sort((a, b) => a - b)
                            : current.filter((p) => p !== percentage);
                          handleManhourThresholdsChange(newPercentages);
                        }}
                      />
                      <Label
                        htmlFor={`manhour-${percentage}`}
                        className="text-sm"
                      >
                        {percentage}%
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* その他の通知 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>スケジュール遅延通知</Label>
                <p className="text-sm text-gray-500">
                  プロジェクト全体の遅延を検知した時
                </p>
              </div>
              <Switch
                checked={preferences.scheduleDelay}
                onCheckedChange={(checked) =>
                  handleToggle("scheduleDelay", checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>タスク割り当て通知</Label>
                <p className="text-sm text-gray-500">
                  新しいタスクが割り当てられた時
                </p>
              </div>
              <Switch
                checked={preferences.taskAssignment}
                onCheckedChange={(checked) =>
                  handleToggle("taskAssignment", checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>プロジェクト状況変更通知</Label>
                <p className="text-sm text-gray-500">
                  プロジェクトのステータスが変更された時
                </p>
              </div>
              <Switch
                checked={preferences.projectStatusChange}
                onCheckedChange={(checked) =>
                  handleToggle("projectStatusChange", checked)
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* クワイエットアワー設定 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock size={20} />
            クワイエットアワー
          </CardTitle>
          <CardDescription>指定した時間帯は通知を停止します</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="quiet-start">開始時刻</Label>
              <Input
                id="quiet-start"
                type="number"
                min="0"
                max="23"
                placeholder="22"
                value={localQuietStart}
                onChange={(e) => setLocalQuietStart(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="quiet-end">終了時刻</Label>
              <Input
                id="quiet-end"
                type="number"
                min="0"
                max="23"
                placeholder="8"
                value={localQuietEnd}
                onChange={(e) => setLocalQuietEnd(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleQuietHoursUpdate}
            disabled={
              !validateQuietHours(
                localQuietStart ? parseInt(localQuietStart) : undefined,
                localQuietEnd ? parseInt(localQuietEnd) : undefined
              )
            }
          >
            クワイエットアワーを更新
          </Button>

          {preferences.quietHoursStart && preferences.quietHoursEnd && (
            <p className="text-sm text-gray-600">
              現在の設定: {preferences.quietHoursStart}:00 〜{" "}
              {preferences.quietHoursEnd}:00
            </p>
          )}
        </CardContent>
      </Card>

      {/* 操作ボタン */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={resetToDefaults}
          disabled={updateState?.success === false}
        >
          <RotateCcw size={16} className="mr-2" />
          デフォルトに戻す
        </Button>
      </div>

      {/* 状態メッセージ */}
      {updateState?.success && (
        <Alert>
          <AlertDescription>設定が正常に更新されました。</AlertDescription>
        </Alert>
      )}

      {updateState?.error && (
        <Alert variant="destructive">
          <AlertDescription>{updateState.error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
