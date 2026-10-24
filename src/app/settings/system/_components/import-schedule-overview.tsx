"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { updateImportScheduleEnabled } from "@/app/settings/system/import-schedule-actions";
import type { ImportScheduleSettingsDto, WbsImportScheduleListItemDto } from "@/types/import-schedule";
import { getImportScheduleLabel, WBS_SYNC_MODE_LABELS } from "@/utils/import-schedule-labels";
import { formatDate } from "@/utils/date-util";

type Props = {
  settings: ImportScheduleSettingsDto;
  schedules: WbsImportScheduleListItemDto[];
};

const formatRunAt = (iso: string) => formatDate(new Date(iso), "YYYY/MM/DD HH:mm:ss");

/** 定期インポートの全体スイッチと、WBSごとの設定一覧（設定の変更は各WBSの設定タブで行う） */
export function ImportScheduleOverview({ settings, schedules }: Props) {
  const router = useRouter();
  const [isEnabled, setIsEnabled] = useState(settings.isEnabled);
  const [isSaving, setIsSaving] = useState(false);
  const enabledCount = schedules.filter((schedule) => schedule.isEnabled).length;

  const onToggle = async (checked: boolean) => {
    setIsSaving(true);
    const result = await updateImportScheduleEnabled(checked);
    setIsSaving(false);
    if (!result.success) {
      toast({ variant: "destructive", title: "保存に失敗しました", description: result.error });
      return;
    }
    setIsEnabled(checked);
    toast({
      title: "保存しました",
      description: checked ? "定期インポートを再開しました。" : "定期インポートを停止しました。",
    });
    router.refresh();
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="text-lg">定期インポート</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-start gap-3">
          <Switch
            id="import-schedule-global-enabled"
            checked={isEnabled}
            onCheckedChange={onToggle}
            disabled={isSaving}
          />
          <div className="space-y-1">
            <Label htmlFor="import-schedule-global-enabled" className="text-base font-medium">
              定期インポートを有効にする
            </Label>
            <p className="text-sm text-muted-foreground">
              すべてのWBSの定期インポートをまとめて停止・再開します。各WBSの頻度や対象は、WBS画面の「設定」タブで変更します。
            </p>
            {!isEnabled && (
              <p className="text-sm text-amber-700">
                定期インポートは停止中です。予定の時刻になってもインポートは実行されず、スキップされます。
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">WBSごとの設定</h3>
            <span className="text-sm text-muted-foreground">
              有効 {enabledCount}件 / 全{schedules.length}件
            </span>
          </div>
          {schedules.length === 0 ? (
            <p className="text-sm text-muted-foreground">WBSがありません</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="whitespace-nowrap">
                  <TableHead>プロジェクト</TableHead>
                  <TableHead>WBS</TableHead>
                  <TableHead>定期インポート</TableHead>
                  <TableHead>頻度</TableHead>
                  <TableHead>同期モード</TableHead>
                  <TableHead>実績（Geppo）</TableHead>
                  <TableHead>次回実行予定</TableHead>
                  <TableHead>前回実行</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules.map((schedule) => (
                  <TableRow key={schedule.wbsId}>
                    <TableCell>{schedule.projectName}</TableCell>
                    <TableCell>{schedule.wbsName}</TableCell>
                    <TableCell>
                      <Badge variant={schedule.isEnabled ? "default" : "secondary"}>
                        {schedule.isEnabled ? "有効" : "無効"}
                      </Badge>
                    </TableCell>
                    <TableCell>{getImportScheduleLabel(schedule.cronExpression)}</TableCell>
                    <TableCell>{WBS_SYNC_MODE_LABELS[schedule.syncMode]}</TableCell>
                    <TableCell>{schedule.includeActuals ? "取り込む" : "取り込まない"}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {schedule.isEnabled && schedule.nextRunAt ? formatRunAt(schedule.nextRunAt) : "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {schedule.lastRunAt ? formatRunAt(schedule.lastRunAt) : "未実行"}
                    </TableCell>
                    <TableCell>
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/wbs/${schedule.wbsId}?tab=settings`}>設定</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
