import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { OutlookScheduleImportSummaryDto } from "@/types/outlook-calendar";

/** 画面に表示するエラー行の上限 */
const MAX_DISPLAYED_ERRORS = 20;

/** サーバーが返す YYYY-MM-DD（暦日）を YYYY/MM/DD で表示する（タイムゾーン変換はしない） */
const formatDateKey = (dateKey: string): string => dateKey.replaceAll("-", "/");

type OutlookImportResultProps = {
  userName: string;
  summary: OutlookScheduleImportSummaryDto;
};

export function OutlookImportResult({ userName, summary }: OutlookImportResultProps) {
  const displayedErrors = summary.errors.slice(0, MAX_DISPLAYED_ERRORS);
  const hiddenErrorCount = summary.errors.length - displayedErrors.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>インポート結果</CardTitle>
        <CardDescription>{userName} さんの予定を取り込みました。</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <div className="flex justify-between border-b py-1">
            <dt className="text-muted-foreground">置き換えた期間</dt>
            <dd data-testid="outlook-import-period">
              {formatDateKey(summary.periodStart)} 〜 {formatDateKey(summary.periodEnd)}
            </dd>
          </div>
          <div className="flex justify-between border-b py-1">
            <dt className="text-muted-foreground">取り込んだ予定</dt>
            <dd data-testid="outlook-import-imported-count">{summary.importedEventCount}件</dd>
          </div>
          <div className="flex justify-between border-b py-1">
            <dt className="text-muted-foreground">登録したスケジュール（日ごとに分割）</dt>
            <dd data-testid="outlook-import-created-count">{summary.createdScheduleCount}件</dd>
          </div>
          <div className="flex justify-between border-b py-1">
            <dt className="text-muted-foreground">取り込まなかった予定（空き時間・他の場所で作業中）</dt>
            <dd data-testid="outlook-import-skipped-count">{summary.skippedEventCount}件</dd>
          </div>
        </dl>

        {summary.errors.length > 0 && (
          <div className="rounded-md border border-destructive/50 p-3 text-sm">
            <p className="font-medium text-destructive">読み込めなかった行（{summary.errors.length}件）</p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              {displayedErrors.map((error) => (
                <li key={error.rowNumber}>
                  {error.rowNumber}行目: {error.message}
                </li>
              ))}
            </ul>
            {hiddenErrorCount > 0 && <p className="mt-2 text-muted-foreground">ほか {hiddenErrorCount} 件</p>}
          </div>
        )}

        <Button asChild>
          <Link href="/schedule">スケジュールを確認</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
