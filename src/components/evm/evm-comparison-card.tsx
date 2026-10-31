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
import { formatEvmValue } from "@/utils/evm-format";
import type { EvmMetricsData } from "@/applications/evm/evm-dashboard-dto";

type EvmComparisonCardProps = {
  current: EvmMetricsData;
  /** 前回の確認日時点のメトリクス（進捗確認サイクルで決まる） */
  previous: EvmMetricsData;
};

type ComparisonRow = {
  label: string;
  previous: number | null;
  current: number | null;
  format: (value: number) => string;
  formatDelta: (delta: number) => string;
};

const withSign = (delta: number, text: string) => (delta > 0 ? `+${text}` : text);

/**
 * 前回の確認時点からの変化。
 * 進捗会議で知りたい「前回から良くなったか・悪くなったか」を、主要指標の前回値・現在値・差で示す。
 * どの指標も大きいほど良いため、増加を緑・減少を赤で示す。
 */
export function EvmComparisonCard({ current, previous }: EvmComparisonCardProps) {
  const formatValue = (value: number) => formatEvmValue(value, current.calculationMode);
  const formatIndex = (value: number) => value.toFixed(3);

  const rows: ComparisonRow[] = [
    {
      label: "SPI",
      previous: previous.spi,
      current: current.spi,
      format: formatIndex,
      formatDelta: (delta) => withSign(delta, delta.toFixed(3)),
    },
    {
      label: "CPI",
      previous: previous.cpi,
      current: current.cpi,
      format: formatIndex,
      formatDelta: (delta) => withSign(delta, delta.toFixed(3)),
    },
    {
      label: "SV",
      previous: previous.sv,
      current: current.sv,
      format: formatValue,
      formatDelta: (delta) => withSign(delta, formatValue(delta)),
    },
    {
      label: "CV",
      previous: previous.cv,
      current: current.cv,
      format: formatValue,
      formatDelta: (delta) => withSign(delta, formatValue(delta)),
    },
    {
      label: "出来高率",
      previous: previous.completionRate,
      current: current.completionRate,
      format: (value) => `${value.toFixed(1)}%`,
      formatDelta: (delta) => withSign(delta, `${delta.toFixed(1)}pt`),
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          前回（{formatDate(new Date(previous.date), "M/D(曜)")}）からの変化
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>指標</TableHead>
                <TableHead className="text-right">前回</TableHead>
                <TableHead className="text-right">現在</TableHead>
                <TableHead className="text-right">変化</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const delta =
                  row.previous !== null && row.current !== null
                    ? row.current - row.previous
                    : null;
                const deltaColor =
                  delta === null || delta === 0
                    ? "text-muted-foreground"
                    : delta > 0
                      ? "text-green-600"
                      : "text-red-600";
                return (
                  <TableRow key={row.label}>
                    <TableCell className="font-medium">{row.label}</TableCell>
                    <TableCell className="text-right">
                      {row.previous !== null ? row.format(row.previous) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.current !== null ? row.format(row.current) : "—"}
                    </TableCell>
                    <TableCell className={`text-right font-medium ${deltaColor}`}>
                      {delta !== null ? row.formatDelta(delta) : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          前回の確認日はプロジェクト設定の「進捗確認のサイクル」で決まります（日次=前営業日、週次=7日前、月次=1ヶ月前）。
        </p>
      </CardContent>
    </Card>
  );
}
