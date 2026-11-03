'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import {
  sortEvmBreakdownRows,
  EVM_BREAKDOWN_SORT_KEYS,
  EVM_BREAKDOWN_SORT_LABELS,
  type EvmBreakdownSortKey,
} from '@/utils/evm-breakdown';
import { formatDate } from '@/utils/date-util';

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
 * 影響の大きさはSV/CV（絶対値）で判断できるよう、差異列と「悪い順」の並び替えを持つ。
 */
export function EvmBreakdownTable({
  title,
  rows,
  calculationMode,
  note,
  thresholds = DEFAULT_EVM_THRESHOLDS,
}: EvmBreakdownTableProps) {
  const [sortKey, setSortKey] = useState<EvmBreakdownSortKey>('default');
  const sortedRows = sortEvmBreakdownRows(rows, sortKey);
  // フェーズ別内訳だけが予定終了日・予測完了日を持つ
  const hasSchedule = rows.some((row) => row.plannedEndDate !== undefined);
  const columnCount = hasSchedule ? 12 : 10;

  const formatScheduleDate = (iso: string | null | undefined) =>
    iso ? formatDate(new Date(iso), 'YYYY/MM/DD') : '—';
  const scheduleDelayText = (days: number | null | undefined) => {
    if (days === null || days === undefined) return '';
    if (days > 0) return `${days}日遅れ`;
    if (days < 0) return `${-days}日前倒し`;
    return '計画どおり';
  };

  const formatValue = (value: number) => formatEvmValue(value, calculationMode);

  // 差異はマイナス（遅れ・超過）を赤で示す
  const varianceColorClass = (value: number) =>
    value < 0 ? 'text-red-600' : '';

  const formatIndex = (value: number | null) =>
    value !== null ? value.toFixed(3) : '—';

  // 色分けはヘルスバッジと同じプロジェクト設定しきい値に連動させる
  // （以前は1.0/0.9ハードコードで、設定を変えてもバッジと表示が矛盾していた）
  const indexColorClass = (value: number | null) =>
    evmIndexTextColorClass(value, thresholds);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">{title}</CardTitle>
        <Select
          value={sortKey}
          onValueChange={(value) => setSortKey(value as EvmBreakdownSortKey)}
        >
          <SelectTrigger
            className="h-7 text-xs w-[170px]"
            aria-label={`${title}の並び順`}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {EVM_BREAKDOWN_SORT_KEYS.map((key) => (
              <SelectItem key={key} value={key}>
                {EVM_BREAKDOWN_SORT_LABELS[key]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
                <TableHead className="text-right">SV</TableHead>
                <TableHead className="text-right">CV</TableHead>
                <TableHead className="text-right">SPI</TableHead>
                <TableHead className="text-right">CPI</TableHead>
                {hasSchedule && (
                  <>
                    <TableHead>予定終了</TableHead>
                    <TableHead>予測完了</TableHead>
                  </>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columnCount}
                    className="text-center text-muted-foreground"
                  >
                    データがありません
                  </TableCell>
                </TableRow>
              ) : (
                sortedRows.map((row) => (
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
                      className={`text-right ${varianceColorClass(row.sv)}`}
                    >
                      {formatValue(row.sv)}
                    </TableCell>
                    <TableCell
                      className={`text-right ${varianceColorClass(row.cv)}`}
                    >
                      {formatValue(row.cv)}
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
                    {hasSchedule && (
                      <>
                        <TableCell>{formatScheduleDate(row.plannedEndDate)}</TableCell>
                        <TableCell>
                          {formatScheduleDate(row.forecastCompletionDate)}
                          <div
                            className={`text-xs ${
                              (row.scheduleDelayDays ?? 0) > 0
                                ? 'text-red-600'
                                : 'text-muted-foreground'
                            }`}
                          >
                            {scheduleDelayText(row.scheduleDelayDays)}
                          </div>
                        </TableCell>
                      </>
                    )}
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
