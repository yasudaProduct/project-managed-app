"use client";

import { useMemo, useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RefreshCw, ListChecks, Ruler, AlertCircle, Download } from "lucide-react";
import { QualitySizeUnit } from "@/domains/quality/value-objects/quality-enums";
import { getMetricDefinitions } from "@/domains/quality/value-objects/metric-definition";
import type {
  QualityTargetListItem,
  WbsQualitySummary,
  QualityTrendPoint,
  FindingsByReviewee,
  FindingsByCategory,
} from "@/applications/quality/quality-application.service";
import {
  syncQualityTargets,
  getWbsQualitySummary,
  getQualityTrend,
  getQualityTargets,
  getWbsAllFindings,
  getQualityFindingsByReviewee,
  getQualityFindingsByCategory,
} from "@/app/wbs/[id]/actions/quality-actions";
import { toast } from "@/hooks/use-toast";
import { QualityTargetDetailModal } from "./quality-target-detail-modal";
import { QualityImportExport } from "./quality-import-export";
import { QualityIndicatorCards } from "./quality-indicator-cards";
import { QualityTrendChart } from "./quality-trend-chart";
import { QualityRevieweeFindingsChart } from "./quality-reviewee-findings-chart";
import { QualityCategoryFindingsChart } from "./quality-category-findings-chart";

type SizeUnitOption = QualitySizeUnit | "MAN_HOUR";

const SIZE_UNIT_LABELS: Record<SizeUnitOption, string> = {
  MAN_HOUR: "工数 (人時)",
  [QualitySizeUnit.PAGE]: "ページ数",
  [QualitySizeUnit.LINES_OF_CODE]: "ステップ数",
  [QualitySizeUnit.TEST_CASE]: "テストケース数",
};

const SOURCE_LABEL: Record<string, string> = {
  REVIEW: "レビュー",
  TEST: "テスト",
};

type FindingRow = Awaited<ReturnType<typeof getWbsAllFindings>>[number];

interface QualityDashboardProps {
  wbsId: number;
  initialTargets: QualityTargetListItem[];
  initialSummary: WbsQualitySummary;
  initialTrend: QualityTrendPoint[];
  initialFindings?: FindingRow[];
  initialRevieweeFindings?: FindingsByReviewee[];
  initialCategoryFindings?: FindingsByCategory[];
}

function formatNumber(n: number | null, digits = 3): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "-";
  return n.toFixed(digits);
}

function downloadTsv(filename: string, headers: string[], rows: (string | number | null | undefined)[][]) {
  const normalize = (v: string | number | null | undefined): string => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    if (s === "-") return "";
    return s.replace(/\t/g, " ").replace(/\r?\n/g, " ");
  };
  const lines = [headers.join("\t"), ...rows.map((r) => r.map(normalize).join("\t"))];
  const text = lines.join("\n");
  const blob = new Blob([text], { type: "text/tab-separated-values;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function QualityDashboard({
  wbsId,
  initialTargets,
  initialSummary,
  initialTrend,
  initialFindings = [],
  initialRevieweeFindings = [],
  initialCategoryFindings = [],
}: QualityDashboardProps) {
  const [targets, setTargets] = useState<QualityTargetListItem[]>(initialTargets);
  const [summary, setSummary] = useState<WbsQualitySummary>(initialSummary);
  const [trend, setTrend] = useState<QualityTrendPoint[]>(initialTrend);
  const [findings, setFindings] = useState<FindingRow[]>(initialFindings);
  const [revieweeFindings, setRevieweeFindings] =
    useState<FindingsByReviewee[]>(initialRevieweeFindings);
  const [categoryFindings, setCategoryFindings] =
    useState<FindingsByCategory[]>(initialCategoryFindings);
  const [sizeUnit, setSizeUnit] = useState<SizeUnitOption>("MAN_HOUR");
  const [selectedPhase, setSelectedPhase] = useState<string>("");
  const [selectedTarget, setSelectedTarget] = useState<QualityTargetListItem | null>(null);
  const [trendFrom, setTrendFrom] = useState("");
  const [trendTo, setTrendTo] = useState("");
  const [isSyncing, startSyncTransition] = useTransition();
  const [isRefreshing, startRefreshTransition] = useTransition();

  const definitions = useMemo(() => getMetricDefinitions(sizeUnit), [sizeUnit]);

  const phases = useMemo(() => {
    const set = new Set<string>();
    for (const t of targets) {
      if (t.phase) set.add(t.phase);
    }
    return Array.from(set).sort();
  }, [targets]);

  const filteredTargets = useMemo(() => {
    if (!selectedPhase) return targets;
    return targets.filter((t) => t.phase === selectedPhase);
  }, [targets, selectedPhase]);

  const filteredFindings = useMemo(() => {
    if (!selectedPhase) return findings;
    return findings.filter((f) => f.phase === selectedPhase);
  }, [findings, selectedPhase]);

  const refreshAll = (unit: SizeUnitOption, from: string, to: string, phase: string) => {
    startRefreshTransition(async () => {
      const [newSummary, newTrend, newTargets, newFindings, newReviewee, newCategory] =
        await Promise.all([
          getWbsQualitySummary(wbsId, unit),
          getQualityTrend(wbsId, unit, from || undefined, to || undefined, phase || undefined),
          getQualityTargets(wbsId, unit),
          getWbsAllFindings(wbsId),
          getQualityFindingsByReviewee(wbsId),
          getQualityFindingsByCategory(wbsId),
        ]);
      setSummary(newSummary);
      setTrend(newTrend);
      setTargets(newTargets);
      setFindings(newFindings);
      setRevieweeFindings(newReviewee);
      setCategoryFindings(newCategory);
    });
  };

  const handleSizeUnitChange = (v: string) => {
    const unit = v as SizeUnitOption;
    setSizeUnit(unit);
    refreshAll(unit, trendFrom, trendTo, selectedPhase);
  };

  const handleDateChange = (from: string, to: string) => {
    setTrendFrom(from);
    setTrendTo(to);
    startRefreshTransition(async () => {
      const newTrend = await getQualityTrend(
        wbsId,
        sizeUnit,
        from || undefined,
        to || undefined,
        selectedPhase || undefined,
      );
      setTrend(newTrend);
    });
  };

  const handlePhaseChange = (phase: string) => {
    setSelectedPhase(phase);
    startRefreshTransition(async () => {
      const newTrend = await getQualityTrend(
        wbsId,
        sizeUnit,
        trendFrom || undefined,
        trendTo || undefined,
        phase || undefined,
      );
      setTrend(newTrend);
    });
  };

  const handleSync = () => {
    startSyncTransition(async () => {
      const result = await syncQualityTargets(wbsId);
      if (result.success && result.data) {
        toast({
          title: "同期完了",
          description: `新規: ${result.data.created}件 / 更新: ${result.data.updated}件 / 無効化: ${result.data.deactivated}件`,
        });
        refreshAll(sizeUnit, trendFrom, trendTo, selectedPhase);
      } else {
        toast({ title: "同期に失敗しました", description: result.error, variant: "destructive" });
      }
    });
  };

  const exportTargetsTsv = () => {
    const baseHeaders = [
      "タスクNo.",
      "タスク名",
      "フェーズ",
      "レビューイ",
      "レビューアー",
      "ページ",
      "ステップ",
      "テストケース",
      "工数(人時)",
    ];
    const metricHeaders = definitions.map((d) => d.label);
    const trailingHeaders = ["指摘", "状態"];
    const headers = [...baseHeaders, ...metricHeaders, ...trailingHeaders];

    const rows = filteredTargets.map((t) => [
      t.taskNo,
      t.name,
      t.phase ?? "",
      t.revieweeName ?? "",
      t.reviewerNames.join(", "),
      t.sizeByUnit.PAGE ?? "",
      t.sizeByUnit.LINES_OF_CODE ?? "",
      t.sizeByUnit.TEST_CASE ?? "",
      t.sizeByUnit.MAN_HOUR ?? "",
      ...definitions.map((d) => formatNumber(t.metrics[d.key])),
      t.findingCount,
      t.isActive ? "有効" : "無効",
    ]);
    downloadTsv(`quality-targets-wbs${wbsId}.tsv`, headers, rows);
  };

  const FINDING_TSV_HEADERS = [
    "タスクNo.",
    "タスク名",
    "フェーズ",
    "ソース",
    "カテゴリ",
    "内容",
    "発見日",
  ];

  const exportFindingsTsv = () => {
    const rows = filteredFindings.map((f) => [
      f.taskNo,
      f.targetName,
      f.phase ?? "",
      SOURCE_LABEL[f.source] ?? f.source,
      f.category ?? "",
      f.description ?? "",
      new Date(f.foundAt).toLocaleDateString("ja-JP"),
    ]);
    downloadTsv(`quality-findings-wbs${wbsId}.tsv`, FINDING_TSV_HEADERS, rows);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Select
          value={selectedPhase || "__all__"}
          onValueChange={(v) => handlePhaseChange(v === "__all__" ? "" : v)}
        >
          <SelectTrigger className="w-[160px] h-8 text-xs">
            <SelectValue placeholder="すべてのフェーズ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">すべて</SelectItem>
            {phases.map((p) => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="h-5 border-l border-gray-200 mx-1" />

        <QualityImportExport wbsId={wbsId} />

        <div className="h-5 border-l border-gray-200 mx-1" />

        <Button variant="outline" size="sm" onClick={handleSync} disabled={isSyncing}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1 ${isSyncing ? "animate-spin" : ""}`} />
          WBSから同期
        </Button>

        <div className="flex items-center gap-1 ml-auto">
          <Ruler className="h-3.5 w-3.5 text-gray-400" />
          <Select value={sizeUnit} onValueChange={handleSizeUnitChange}>
            <SelectTrigger className="w-[150px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(SIZE_UNIT_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <QualityIndicatorCards summary={summary} />

      <Card>
        <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm flex items-center gap-2">
            <ListChecks className="h-4 w-4" />
            評価対象一覧
            {selectedPhase && (
              <Badge variant="secondary" className="text-xs">{selectedPhase}</Badge>
            )}
            {isRefreshing && <span className="text-xs text-gray-400 font-normal">更新中…</span>}
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={exportTargetsTsv}
            disabled={filteredTargets.length === 0}
          >
            <Download className="h-3.5 w-3.5 mr-1" />
            TSV出力
          </Button>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {filteredTargets.length === 0 ? (
            <p className="text-center py-6 text-sm text-gray-500">
              評価対象がありません。WBSから同期するか、フィルタを見直してください。
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">タスクNo.</TableHead>
                  <TableHead className="text-xs">タスク名</TableHead>
                  <TableHead className="text-xs">フェーズ</TableHead>
                  <TableHead className="text-xs">レビューイ</TableHead>
                  <TableHead className="text-xs">レビューアー</TableHead>
                  <TableHead className="text-xs text-right">ページ</TableHead>
                  <TableHead className="text-xs text-right">ステップ</TableHead>
                  <TableHead className="text-xs text-right">テストケース</TableHead>
                  <TableHead className="text-xs text-right">工数(人時)</TableHead>
                  {definitions.map((d) => (
                    <TableHead key={d.key} className="text-xs text-right">{d.label}</TableHead>
                  ))}
                  <TableHead className="text-xs text-right">指摘</TableHead>
                  <TableHead className="text-xs">状態</TableHead>
                  <TableHead className="text-xs text-right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTargets.map((t) => (
                  <TableRow key={t.id} className={!t.isActive ? "opacity-50" : undefined}>
                    <TableCell className="font-mono text-xs py-2">{t.taskNo}</TableCell>
                    <TableCell className="text-xs py-2">{t.name}</TableCell>
                    <TableCell className="text-xs text-gray-500 py-2">{t.phase ?? "-"}</TableCell>
                    <TableCell className="text-xs py-2">{t.revieweeName ?? "-"}</TableCell>
                    <TableCell className="text-xs py-2">
                      {t.reviewerNames.length > 0 ? t.reviewerNames.join(", ") : "-"}
                    </TableCell>
                    <TableCell className="text-xs text-right py-2">
                      {t.sizeByUnit.PAGE ?? "-"}
                    </TableCell>
                    <TableCell className="text-xs text-right py-2">
                      {t.sizeByUnit.LINES_OF_CODE ?? "-"}
                    </TableCell>
                    <TableCell className="text-xs text-right py-2">
                      {t.sizeByUnit.TEST_CASE ?? "-"}
                    </TableCell>
                    <TableCell className="text-xs text-right py-2">
                      {t.sizeByUnit.MAN_HOUR ?? "-"}
                    </TableCell>
                    {definitions.map((d) => (
                      <TableCell key={d.key} className="text-xs text-right py-2">
                        {formatNumber(t.metrics[d.key])}
                      </TableCell>
                    ))}
                    <TableCell className="text-xs text-right py-2">{t.findingCount}</TableCell>
                    <TableCell className="py-2">
                      {t.isActive ? (
                        <Badge variant="default" className="text-xs">有効</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">無効</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right py-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs"
                        onClick={() => setSelectedTarget(t)}
                        disabled={!t.isActive}
                      >
                        詳細
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <QualityTrendChart
        data={trend}
        sizeUnit={sizeUnit}
        fromDate={trendFrom}
        toDate={trendTo}
        onDateChange={handleDateChange}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <QualityRevieweeFindingsChart data={revieweeFindings} />
        <QualityCategoryFindingsChart data={categoryFindings} />
      </div>

      <Card>
        <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            指摘一覧
            {selectedPhase && (
              <Badge variant="secondary" className="text-xs">{selectedPhase}</Badge>
            )}
            <span className="text-xs text-gray-400 font-normal ml-1">{filteredFindings.length}件</span>
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={exportFindingsTsv}
            disabled={filteredFindings.length === 0}
          >
            <Download className="h-3.5 w-3.5 mr-1" />
            TSV出力
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {filteredFindings.length === 0 ? (
            <p className="text-center py-6 text-sm text-gray-500">指摘がありません。</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">タスクNo.</TableHead>
                  <TableHead className="text-xs">タスク名</TableHead>
                  <TableHead className="text-xs">フェーズ</TableHead>
                  <TableHead className="text-xs">ソース</TableHead>
                  <TableHead className="text-xs">カテゴリ</TableHead>
                  <TableHead className="text-xs">内容</TableHead>
                  <TableHead className="text-xs">発見日</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFindings.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="font-mono text-xs py-2">{f.taskNo}</TableCell>
                    <TableCell className="text-xs py-2 max-w-[160px] truncate">{f.targetName}</TableCell>
                    <TableCell className="text-xs text-gray-500 py-2">{f.phase ?? "-"}</TableCell>
                    <TableCell className="text-xs py-2">
                      <Badge variant="outline" className="text-xs">
                        {SOURCE_LABEL[f.source] ?? f.source}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs py-2 text-gray-600">{f.category ?? "-"}</TableCell>
                    <TableCell className="text-xs py-2 max-w-[240px] truncate">{f.description ?? "-"}</TableCell>
                    <TableCell className="text-xs py-2 text-gray-500">
                      {new Date(f.foundAt).toLocaleDateString("ja-JP")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {selectedTarget && (
        <QualityTargetDetailModal
          wbsId={wbsId}
          target={selectedTarget}
          onClose={() => setSelectedTarget(null)}
          onChanged={(updated) => {
            setTargets((prev) =>
              prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)),
            );
            refreshAll(sizeUnit, trendFrom, trendTo, selectedPhase);
          }}
        />
      )}
    </div>
  );
}
