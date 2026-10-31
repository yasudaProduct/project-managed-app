import { Database } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/utils/date-util";
import type { DataFreshnessDto } from "@/applications/data-freshness/data-freshness-application-service";

type DataFreshnessPanelProps = {
  freshness: DataFreshnessDto;
};

const SYNC_STATUS_LABELS: Record<NonNullable<DataFreshnessDto["lastWbsSync"]>["status"], string> = {
  SUCCESS: "成功",
  PARTIAL: "一部失敗",
  FAILED: "失敗",
};

const shortDate = (iso: string) => formatDate(new Date(iso), "M/D(曜)");

/**
 * データの鮮度（この数字は信用できるか）。
 * WBSの最終同期、実績（月報）の入力漏れ、タスクデータの不備を示す。
 * 実績の入力漏れがあると AC が少なく出て CPI が実態より良く見えるため、EVM と並べて表示する。
 */
export function DataFreshnessPanel({ freshness }: DataFreshnessPanelProps) {
  const { lastWbsSync, entryCheck, taskIssues } = freshness;
  const assigneesWithMissing = entryCheck.assignees.filter(
    (assignee) => assignee.missingDates.length > 0
  );
  const issueBadges = [
    { label: "担当者未設定", count: taskIssues.noAssigneeCount },
    { label: "基準工数未設定", count: taskIssues.noBaselineCount },
    { label: "着手中で進捗率0%", count: taskIssues.zeroProgressInProgressCount },
  ].filter((issue) => issue.count > 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Database className="h-4 w-4 text-gray-500" />
          データの鮮度
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-gray-700">
          WBS同期:{" "}
          {lastWbsSync
            ? `${formatDate(new Date(lastWbsSync.syncedAt), "YYYY/MM/DD HH:mm:ss")}（${SYNC_STATUS_LABELS[lastWbsSync.status]}）`
            : "履歴なし"}
        </p>

        <div className="space-y-2">
          <p className="text-gray-700">
            実績（月報）
            {entryCheck.windowStart && entryCheck.windowEnd && (
              <span className="text-xs text-gray-500">
                {" "}
                直近{shortDate(entryCheck.windowStart)}〜{shortDate(entryCheck.windowEnd)}の営業日
              </span>
            )}
            :{" "}
            {assigneesWithMissing.length > 0 ? (
              <span className="font-medium text-red-600">
                入力漏れ {assigneesWithMissing.length}人
              </span>
            ) : (
              <span className="text-green-700">入力漏れはありません</span>
            )}
          </p>
          {assigneesWithMissing.length > 0 && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>担当者</TableHead>
                    <TableHead>最終入力日</TableHead>
                    <TableHead className="text-right">入力漏れ</TableHead>
                    <TableHead>入力漏れの日</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assigneesWithMissing.map((assignee) => (
                    <TableRow key={assignee.userId}>
                      <TableCell className="font-medium">{assignee.name}</TableCell>
                      <TableCell>
                        {assignee.lastRecordDate
                          ? shortDate(assignee.lastRecordDate)
                          : "なし"}
                      </TableCell>
                      <TableCell className="text-right text-red-600">
                        {assignee.missingDates.length}日
                      </TableCell>
                      <TableCell className="text-xs text-gray-600">
                        {assignee.missingDates.map(shortDate).join("、")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <p className="text-xs text-gray-500">
            予定タスクのある営業日に実績（全案件の合計）が0時間の日を入力漏れとしています。全日休暇の予定がある日は除きます。入力漏れの分だけ AC が少なく、CPI が実態より良く見えます。
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-gray-700">タスクデータ:</span>
          {issueBadges.length > 0 ? (
            issueBadges.map((issue) => (
              <Badge key={issue.label} variant="outline" className="text-xs">
                {issue.label} {issue.count}件
              </Badge>
            ))
          ) : (
            <span className="text-green-700">不備はありません</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
