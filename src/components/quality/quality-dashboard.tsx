"use client";

import { useState, useTransition, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { RefreshCw } from "lucide-react";
import { QualitySizeUnit } from "@/domains/quality/value-objects/quality-enums";
import { IPA_METRIC_DEFINITIONS } from "@/domains/quality/value-objects/metric-definition";
import type { WbsSummary } from "@/applications/quality/quality-metrics.service";
import {
  getQualityTargets,
  getWbsQualitySummary,
  getWbsAllFindings,
  syncQualityTargets,
} from "@/app/wbs/[id]/actions/quality-actions";
import type { QualityTargetItem, QualityFindingItem } from "@/app/wbs/[id]/actions/quality-actions";
import { QualityKpiCards } from "./quality-kpi-cards";
import { ScatterPlotChart } from "./charts/scatter-plot-chart";
import { PbCurveChart } from "./charts/pb-curve-chart";
import { ParetoChart } from "./charts/pareto-chart";
import { QualityImportDialog } from "./quality-import-dialog";

interface Props {
  wbsId: number;
  initialTargets: QualityTargetItem[];
  initialSummary: WbsSummary;
  initialFindings: QualityFindingItem[];
}

const sizeUnitOptions: { value: QualitySizeUnit; label: string }[] = [
  { value: QualitySizeUnit.PAGE, label: "PAGE" },
  { value: QualitySizeUnit.LOC, label: "LOC (KLOC)" },
  { value: QualitySizeUnit.FP, label: "FP" },
  { value: QualitySizeUnit.TEST_CASE, label: "テストケース" },
];

export function QualityDashboard({ wbsId, initialTargets, initialSummary, initialFindings }: Props) {
  const [sizeUnit, setSizeUnit] = useState<QualitySizeUnit>(QualitySizeUnit.PAGE);
  const [targets, setTargets] = useState<QualityTargetItem[]>(initialTargets);
  const [summary, setSummary] = useState<WbsSummary>(initialSummary);
  const [findings, setFindings] = useState<QualityFindingItem[]>(initialFindings);
  const [isPending, startTransition] = useTransition();

  const refresh = useCallback(() => {
    startTransition(async () => {
      const [newTargets, newSummary, newFindings] = await Promise.all([
        getQualityTargets(wbsId, sizeUnit, true),
        getWbsQualitySummary(wbsId, sizeUnit),
        getWbsAllFindings(wbsId),
      ]);
      setTargets(newTargets);
      setSummary(newSummary);
      setFindings(newFindings);
    });
  }, [wbsId, sizeUnit]);

  useEffect(() => {
    refresh();
  }, [sizeUnit]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSync = () => {
    startTransition(async () => {
      await syncQualityTargets(wbsId);
      refresh();
    });
  };

  const metricKeys = Object.keys(IPA_METRIC_DEFINITIONS) as (keyof typeof IPA_METRIC_DEFINITIONS)[];

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={sizeUnit} onValueChange={(v) => setSizeUnit(v as QualitySizeUnit)}>
          <SelectTrigger className="w-[150px] h-8 text-xs">
            <SelectValue placeholder="規模単位" />
          </SelectTrigger>
          <SelectContent>
            {sizeUnitOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <QualityImportDialog wbsId={wbsId} onImported={refresh} />
        <Button variant="outline" size="sm" onClick={handleSync} disabled={isPending}>
          <RefreshCw className={`h-4 w-4 mr-1 ${isPending ? "animate-spin" : ""}`} />
          同期
        </Button>
      </div>

      {/* KPI Cards */}
      <QualityKpiCards summary={summary} sizeUnit={sizeUnit} />

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm">散布図</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <ScatterPlotChart wbsId={wbsId} sizeUnit={sizeUnit} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm">PB曲線</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <PbCurveChart
              targets={targets.map((t) => ({ id: t.id, name: t.name, taskNo: t.taskNo }))}
            />
          </CardContent>
        </Card>
      </div>

      {/* Pareto */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm">パレート図</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <ParetoChart wbsId={wbsId} />
        </CardContent>
      </Card>

      {/* Target Table */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm">評価対象一覧</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">タスクNo</TableHead>
                  <TableHead className="text-xs">名称</TableHead>
                  <TableHead className="text-xs">SS</TableHead>
                  <TableHead className="text-xs">工程</TableHead>
                  {metricKeys.map((key) => (
                    <TableHead key={key} className="text-xs text-right">
                      {IPA_METRIC_DEFINITIONS[key].label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {targets.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="text-xs font-mono">{t.taskNo}</TableCell>
                    <TableCell className="text-xs">{t.name}</TableCell>
                    <TableCell className="text-xs">{t.subsystem ?? "-"}</TableCell>
                    <TableCell className="text-xs">{t.phaseCode ?? "-"}</TableCell>
                    {metricKeys.map((key) => (
                      <TableCell key={key} className="text-xs text-right font-mono">
                        {t.metrics[key] !== null ? t.metrics[key]!.toFixed(3) : "-"}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
                {targets.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4 + metricKeys.length} className="text-center text-muted-foreground text-xs py-8">
                      評価対象がありません。「同期」で WBS タスクから自動作成してください。
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Findings Table */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm">指摘一覧 ({findings.length}件)</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">ソース</TableHead>
                  <TableHead className="text-xs">混入工程</TableHead>
                  <TableHead className="text-xs">事象</TableHead>
                  <TableHead className="text-xs">原因</TableHead>
                  <TableHead className="text-xs">カテゴリ</TableHead>
                  <TableHead className="text-xs">説明</TableHead>
                  <TableHead className="text-xs">検出日</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {findings.slice(0, 100).map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="text-xs">{f.source}</TableCell>
                    <TableCell className="text-xs">{f.injectionPhase ?? "-"}</TableCell>
                    <TableCell className="text-xs">{f.phenomenonType ?? "-"}</TableCell>
                    <TableCell className="text-xs">{f.causeType ?? "-"}</TableCell>
                    <TableCell className="text-xs">{f.category ?? "-"}</TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate">{f.description ?? "-"}</TableCell>
                    <TableCell className="text-xs">{f.foundAt.slice(0, 10)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
