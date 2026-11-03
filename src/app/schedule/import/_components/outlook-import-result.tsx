import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ActionResult } from "@/types/action-result";
import type { OutlookScheduleImportSummaryDto } from "@/types/outlook-calendar";

/** ファイルごとに表示するエラー行の上限 */
const MAX_DISPLAYED_ERRORS = 20;

/** サーバーが返す YYYY-MM-DD（暦日）を YYYY/MM/DD で表示する（タイムゾーン変換はしない） */
const formatDateKey = (dateKey: string): string => dateKey.replaceAll("-", "/");

export type OutlookFileImportOutcome = {
  fileName: string;
  userName: string;
  result: ActionResult<OutlookScheduleImportSummaryDto>;
};

type OutlookImportResultsProps = {
  outcomes: ReadonlyArray<OutlookFileImportOutcome>;
};

export function OutlookImportResults({ outcomes }: OutlookImportResultsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>インポート結果</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Table aria-label="インポート結果">
          <TableHeader>
            <TableRow>
              <TableHead>ファイル</TableHead>
              <TableHead>取り込み先</TableHead>
              <TableHead>結果</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {outcomes.map((outcome) => (
              <TableRow key={outcome.fileName}>
                <TableCell className="font-medium align-top">{outcome.fileName}</TableCell>
                <TableCell className="align-top">{outcome.userName}</TableCell>
                <TableCell className="align-top">
                  {outcome.result.success ? (
                    <SummaryCell summary={outcome.result.data} />
                  ) : (
                    <span className="text-destructive">失敗: {outcome.result.error}</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Button asChild>
          <Link href="/schedule">スケジュールを確認</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function SummaryCell({ summary }: { summary: OutlookScheduleImportSummaryDto }) {
  const displayedErrors = summary.errors.slice(0, MAX_DISPLAYED_ERRORS);
  const hiddenErrorCount = summary.errors.length - displayedErrors.length;

  return (
    <div className="space-y-1 text-sm">
      <p>
        置き換えた期間: {formatDateKey(summary.periodStart)} 〜 {formatDateKey(summary.periodEnd)}
      </p>
      <p>
        取り込み {summary.importedEventCount}件・登録 {summary.createdScheduleCount}件・スキップ{" "}
        {summary.skippedEventCount}件
      </p>
      {summary.errors.length > 0 && (
        <div className="text-destructive">
          <p>読み込めなかった行（{summary.errors.length}件）</p>
          <ul className="list-disc pl-5">
            {displayedErrors.map((error) => (
              <li key={error.rowNumber}>
                {error.rowNumber}行目: {error.message}
              </li>
            ))}
          </ul>
          {hiddenErrorCount > 0 && <p>ほか {hiddenErrorCount} 件</p>}
        </div>
      )}
    </div>
  );
}
