'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { EvmBreakdownRow } from '@/applications/evm/evm-dashboard-dto';
import {
  formatEvmValue,
  evmIndexTextColorClass,
  DEFAULT_EVM_THRESHOLDS,
  type EvmThresholds,
} from '@/utils/evm-format';

type EvmBreakdownTableProps = {
  title: string;
  rows: EvmBreakdownRow[];
  calculationMode: 'hours' | 'cost';
  /** 軸に関する注記（担当者別の帰属基準など） */
  note?: string;
  /** SPI/CPIの色分けしきい値（プロジェクト設定値）。未指定時は既定の90%/80% */
  thresholds?: EvmThresholds;
};

/**
 * フェーズ別・担当者別のEVM内訳テーブル。
 * SPI/CPIがnull（PV/AC未発生・未紐付け行）は「—」表示。
 */
export function EvmBreakdownTable({
  title,
  rows,
  calculationMode,
  note,
  thresholds = DEFAULT_EVM_THRESHOLDS,
}: EvmBreakdownTableProps) {
  const formatValue = (value: number) => formatEvmValue(value, calculationMode);

  const formatIndex = (value: number | null) =>
    value !== null ? value.toFixed(3) : '—';

  // 色分けはヘルスバッジと同じプロジェクト設定しきい値に連動させる
  // （以前は1.0/0.9ハードコードで、設定を変えてもバッジと表示が矛盾していた）
  const indexColorClass = (value: number | null) =>
    evmIndexTextColorClass(value, thresholds);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名称</TableHead>
                <TableHead className="text-right">タスク数</TableHead>
                <TableHead className="text-right">PV</TableHead>
                <TableHead className="text-right">EV</TableHead>
                <TableHead className="text-right">AC</TableHead>
                <TableHead className="text-right">BAC</TableHead>
                <TableHead className="text-right">SPI</TableHead>
                <TableHead className="text-right">CPI</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center text-muted-foreground"
                  >
                    データがありません
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow
                    key={row.key}
                    className={row.isUnlinked ? 'text-muted-foreground' : ''}
                  >
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell className="text-right">
                      {row.isUnlinked ? '—' : row.taskCount}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatValue(row.pv)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatValue(row.ev)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatValue(row.ac)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatValue(row.bac)}
                    </TableCell>
                    <TableCell
                      className={`text-right font-medium ${indexColorClass(row.spi)}`}
                    >
                      {formatIndex(row.spi)}
                    </TableCell>
                    <TableCell
                      className={`text-right font-medium ${indexColorClass(row.cpi)}`}
                    >
                      {formatIndex(row.cpi)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {note && <p className="mt-3 text-xs text-muted-foreground">{note}</p>}
      </CardContent>
    </Card>
  );
}
