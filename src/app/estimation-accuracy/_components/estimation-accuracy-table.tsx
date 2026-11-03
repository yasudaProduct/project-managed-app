import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatEvmValue } from "@/utils/evm-format";
import type { EstimationAccuracyRow } from "@/applications/estimation-accuracy/get-estimation-accuracy-handler";

type EstimationAccuracyTableProps = {
  title: string;
  rows: EstimationAccuracyRow[];
};

const formatPct = (value: number) => `${value.toFixed(1)}%`;

/**
 * 見積精度の表。実績 / 基準 が100%を超える（見積より多くかかった）グループを赤字で示す。
 */
export function EstimationAccuracyTable({ title, rows }: EstimationAccuracyTableProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-gray-500">完了タスクがありません</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名称</TableHead>
                  <TableHead className="text-right">プロジェクト数</TableHead>
                  <TableHead className="text-right">完了タスク数</TableHead>
                  <TableHead className="text-right">基準工数</TableHead>
                  <TableHead className="text-right">実績工数</TableHead>
                  <TableHead className="text-right">実績 / 基準</TableHead>
                  <TableHead className="text-right">超過タスクの割合</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.key}>
                    <TableCell className="font-medium">{row.label}</TableCell>
                    <TableCell className="text-right">{row.projectCount}</TableCell>
                    <TableCell className="text-right">{row.taskCount}</TableCell>
                    <TableCell className="text-right">
                      {formatEvmValue(row.baselineHours, "hours")}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatEvmValue(row.actualHours, "hours")}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.actualToBaselineRatio !== null ? (
                        <span
                          className={
                            row.actualToBaselineRatio > 1 ? "font-medium text-red-600" : ""
                          }
                        >
                          {formatPct(row.actualToBaselineRatio * 100)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatPct(row.overrunTaskRatePct)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
