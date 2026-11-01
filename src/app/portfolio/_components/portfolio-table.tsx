import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/utils/date-util";
import { formatEvmValue } from "@/utils/evm-format";
import type { PortfolioRowDto } from "@/applications/portfolio/portfolio-application-service";

type PortfolioTableProps = {
  rows: PortfolioRowDto[];
};

const HEALTH_BADGES: Record<
  PortfolioRowDto["healthStatus"],
  { label: string; className: string }
> = {
  critical: { label: "危機的", className: "bg-red-600 hover:bg-red-600" },
  warning: { label: "注意", className: "bg-yellow-500 hover:bg-yellow-500" },
  healthy: { label: "健全", className: "bg-green-500 hover:bg-green-500" },
  no_data: { label: "開始前", className: "bg-gray-400 hover:bg-gray-400" },
};

const formatIndex = (value: number | null) => (value !== null ? value.toFixed(3) : "—");
const formatHours = (value: number | null) =>
  value !== null ? formatEvmValue(value, "hours") : "—";

function scheduleDelayText(days: number | null): string {
  if (days === null) return "";
  if (days > 0) return `${days}日遅れ`;
  if (days < 0) return `${-days}日前倒し`;
  return "計画どおり";
}

/**
 * ポートフォリオ一覧の表。行は危ない順（サーバー側で並び替え済み）。
 * 値は工数（h）。プロジェクト名からプロジェクト画面へ移動できる。
 */
export function PortfolioTable({ rows }: PortfolioTableProps) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        対象のプロジェクトがありません（未開始・進行中のプロジェクトにWBSがありません）
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>プロジェクト / WBS</TableHead>
            <TableHead>ヘルス</TableHead>
            <TableHead className="text-right">SPI</TableHead>
            <TableHead className="text-right">CPI</TableHead>
            <TableHead className="text-right">出来高率</TableHead>
            <TableHead>予測完了日</TableHead>
            <TableHead className="text-right">EAC / VAC</TableHead>
            <TableHead>遅れタスク</TableHead>
            <TableHead className="text-right">入力漏れ</TableHead>
            <TableHead>WBS同期</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const badge = HEALTH_BADGES[row.healthStatus];
            return (
              <TableRow key={row.wbsId}>
                <TableCell>
                  <Link
                    href={`/projects/${row.projectId}`}
                    className="font-medium text-blue-700 hover:underline"
                  >
                    {row.projectName}
                  </Link>
                  <div className="text-xs text-gray-500">{row.wbsName}</div>
                </TableCell>
                {row.loadError ? (
                  <TableCell colSpan={9} className="text-sm text-red-600">
                    {row.loadError}
                  </TableCell>
                ) : (
                  <>
                    <TableCell>
                      <Badge className={badge.className}>{badge.label}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{formatIndex(row.spi)}</TableCell>
                    <TableCell className="text-right">{formatIndex(row.cpi)}</TableCell>
                    <TableCell className="text-right">
                      {row.completionRate !== null ? `${row.completionRate.toFixed(1)}%` : "—"}
                    </TableCell>
                    <TableCell>
                      {row.forecastCompletionDate
                        ? formatDate(new Date(row.forecastCompletionDate), "YYYY/MM/DD")
                        : "—"}
                      <div
                        className={`text-xs ${
                          (row.scheduleDelayDays ?? 0) > 0 ? "text-red-600" : "text-gray-500"
                        }`}
                      >
                        {scheduleDelayText(row.scheduleDelayDays)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatHours(row.eac)}
                      <div
                        className={`text-xs ${
                          (row.vac ?? 0) < 0 ? "text-red-600" : "text-gray-500"
                        }`}
                      >
                        {formatHours(row.vac)}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className={row.endOverdueCount > 0 ? "text-red-600" : ""}>
                        終了遅れ {row.endOverdueCount}
                      </div>
                      <div className={row.startOverdueCount > 0 ? "text-red-600" : ""}>
                        開始遅れ {row.startOverdueCount}
                      </div>
                    </TableCell>
                    <TableCell
                      className={`text-right ${
                        row.assigneesWithMissingEntries > 0 ? "text-red-600" : ""
                      }`}
                    >
                      {row.assigneesWithMissingEntries}人
                    </TableCell>
                    <TableCell className="text-xs text-gray-600">
                      {row.lastWbsSyncAt
                        ? formatDate(new Date(row.lastWbsSyncAt), "YYYY/MM/DD HH:mm:ss")
                        : "履歴なし"}
                    </TableCell>
                  </>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
