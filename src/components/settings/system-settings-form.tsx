"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useEffect, useState, useTransition } from "react";
import {
  getSystemSettings,
  updateSystemSettings,
} from "@/app/settings/system/system-settings-actions";
import { useToast } from "@/hooks/use-toast";

export function SystemSettingsForm() {
  const [standardWorkingHours, setStandardWorkingHours] = useState<string>("7.5");
  const [defaultUserCostPerHour, setDefaultUserCostPerHour] = useState<string>("");
  const [saving, startTransition] = useTransition();
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      try {
        const data = await getSystemSettings();
        setStandardWorkingHours(data.standardWorkingHours.toString());
        setDefaultUserCostPerHour(
          data.defaultUserCostPerHour?.toString() ?? ""
        );
      } catch {
        toast({
          variant: "destructive",
          title: "エラー",
          description: "設定の読み込みに失敗しました",
        });
      }
    })();
  }, [toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const hours = parseFloat(standardWorkingHours);
    const cost = defaultUserCostPerHour
      ? parseFloat(defaultUserCostPerHour)
      : null;

    if (isNaN(hours) || hours <= 0) {
      toast({
        variant: "destructive",
        title: "入力エラー",
        description: "基本稼働時間は正の数値を入力してください",
      });
      return;
    }

    if (defaultUserCostPerHour && (isNaN(cost!) || cost! < 0)) {
      toast({
        variant: "destructive",
        title: "入力エラー",
        description: "デフォルト人員原価は0以上の数値を入力してください",
      });
      return;
    }

    startTransition(async () => {
      try {
        await updateSystemSettings(hours, cost);
        toast({
          title: "保存成功",
          description: "システム設定を保存しました",
        });
      } catch (error) {
        toast({
          variant: "destructive",
          title: "保存失敗",
          description:
            error instanceof Error ? error.message : "設定の保存に失敗しました",
        });
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">システム設定</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 基本稼働時間 */}
          <div className="space-y-2">
            <Label htmlFor="standardWorkingHours" className="text-base font-medium">
              基本稼働時間（時間/日）
            </Label>
            <div className="text-sm text-gray-500">
              1日あたりの標準的な稼働時間を設定します。スケジュール計算や工数計算に使用されます。
            </div>
            <Input
              id="standardWorkingHours"
              type="number"
              step="0.5"
              min="0"
              value={standardWorkingHours}
              onChange={(e) => setStandardWorkingHours(e.target.value)}
              placeholder="7.5"
              className="max-w-xs"
              required
            />
          </div>

          {/* デフォルト人員原価 */}
          <div className="space-y-2">
            <Label htmlFor="defaultUserCostPerHour" className="text-base font-medium">
              デフォルト人員原価（円/時間）
            </Label>
            <div className="text-sm text-gray-500">
              時間単位のデフォルト人員原価を設定します。プロジェクトコスト計算の参考値として使用されます。
            </div>
            <Input
              id="defaultUserCostPerHour"
              type="number"
              step="100"
              min="0"
              value={defaultUserCostPerHour}
              onChange={(e) => setDefaultUserCostPerHour(e.target.value)}
              placeholder="例: 5000"
              className="max-w-xs"
            />
          </div>

          {/* 保存ボタン */}
          <div className="flex justify-start">
            <Button type="submit" disabled={saving}>
              {saving ? "保存中..." : "保存"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
