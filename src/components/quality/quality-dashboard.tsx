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
import { RefreshCw, ListChecks, Ruler, AlertCircle } from "lucide-react";
import { QualitySizeUnit, QualitySeverity } from "@/domains/quality/value-objects/quality-enums";
import type {
  QualityTargetListItem,
  WbsQualitySummary,
  QualityTrendPoint,
  WbsFindingItem,
} from "@/applications/quality/quality-application.service";
import {
  syncQualityTargets,
  getWbsQualitySummary,
  getQualityTrend,
  getQualityTargets,
  getWbsAllFindings,
} from "@/app/wbs/[id]/actions/quality-actions";
import { toast } from "@/hooks/use-toast";
import { QualityTargetDetailModal } from "./quality-target-detail-modal";
import { QualityImportExport } from "./quality-import-export";
import { QualityThresholdSettings } from "./quality-threshold-settings";
import { QualityIndicatorCards } from "./quality-indicator-cards";
import { QualityTrendChart } from "./quality-trend-chart";
import type { QualityThresholds } from "@/domains/quality/value-objects/quality-threshold";

type SizeUnitOption = QualitySizeUnit | "MAN_HOUR";

const SIZE_UNIT_LABELS: Record<SizeUnitOption, string> = {
  MAN_HOUR: "工数 (人時)",
  [QualitySizeUnit.PAGE]: "ページ数",
  [QualitySizeUnit.LINES_OF_CODE]: "ステップ数",
  [QualitySizeUnit.TEST_CASE]: "テストケース数",
};

const SEVERITY_LABEL: Record<QualitySeverity, string> = {
  [QualitySeverity.MAJOR]: "Major",
  [QualitySeverity.MINOR]: "Minor",
  [QualitySeverity.INFO]: "Info",
};

const SEVERITY_CLASS: Record<QualitySeverity, string> = {
  [QualitySeverity.MAJOR]: "text-red-600 font-semibold",
  [QualitySeverity.MINOR]: "text-yellow-600",
  [QualitySeverity.INFO]: "text-gray-500",
};

type FindingRow = Awaited<ReturnType<typeof getWbsAllFindings>>[number];

interface QualityDashboardProps {
  wbsId: number;
  projectId: string;
  initialTargets: QualityTargetListItem[];
  initialThresholds: QualityThresholds;
  initialSummary: WbsQualitySummary;
  initialTrend: QualityTrendPoint[];
  initialFindings?: FindingRow[];
}

export function QualityDashboard({
  wbsId,
  projectId,
  initialTargets,
  initialThresholds,
  initialSummary,
  initialTrend,
  initialFindings = [],
}: QualityDashboardProps) {
  const [targets, setTargets] = useState<QualityTargetListItem[]>(initialTargets);
  const [summary, setSummary] = useState<WbsQualitySummary>(initialSummary);
  const [trend, setTrend] = useState<QualityTrendPoint[]>(initialTrend);
  const [findings, setFindings] = useState<FindingRow[]>(initialFindings);
  const [sizeUnit, setSizeUnit] = useState<SizeUnitOption>("MAN_HOUR");
  const [selectedPhase, setSelectedPhase] = useState<string>("");
  const [selectedTarget, setSelectedTarget] = useState<QualityTargetListItem | null>(null);
  const [trendFrom, setTrendFrom] = useState("");
  const [trendTo, setTrendTo] = useState("");
  const thresholds = initialThresholds;
  const [isSyncing, startSyncTransition] = useTransition();
  const [isRefreshing, startRefreshTransition] = useTransition();

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
      const [newSummary, newTrend, newTargets, newFindings] = await Promise.all([
        getWbsQualitySummary(wbsId, unit, thresholds),
        getQualityTrend(wbsId, unit, from || undefined, to || undefined, phase || undefined),
        getQualityTargets(wbsId),
        getWbsAllFindings(wbsId),
      ]);
      setSummary(newSummary);
      setTrend(newTrend);
      setTargets(newTargets);
      setFindings(newFindings);
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

  return (
    <div className="space-y-4">
      {/* ① フェーズ選択 + インポート/エクスポート ボタン行 */}
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

        <QualityImportExport wbsId={wbsId} sizeUnit={sizeUnit} />

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

      {/* ② 指標ミニマム表示 */}
      <QualityIndicatorCards summary={summary} />

      {/* ③ 評価対象一覧 */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <ListChecks className="h-4 w-4" />
            評価対象一覧
            {selectedPhase && (
              <Badge variant="secondary" className="text-xs">{selectedPhase}</Badge>
            )}
            {isRefreshing && <span className="text-xs text-gray-400 font-normal">更新中…</span>}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
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
                  <TableHead className="text-xs text-right">レビュアー</TableHead>
                  <TableHead className="text-xs text-right">指摘</TableHead>
                  <TableHead className="text-xs text-right">Major</TableHead>
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
                    <TableCell className="text-xs text-right py-2">{t.reviewerCount}</TableCell>
                    <TableCell className="text-xs text-right py-2">{t.findingCount}</TableCell>
                    <TableCell className="text-xs text-right py-2">
                      {t.majorCount > 0 ? (
                        <span className="text-red-600 font-semibold">{t.majorCount}</span>
                      ) : t.majorCount}
                    </TableCell>
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

      {/* ④ 日次推移 (日付フィルタ内包) */}
      <QualityTrendChart
        data={trend}
        thresholds={thresholds}
        fromDate={trendFrom}
        toDate={trendTo}
        onDateChange={handleDateChange}
      />

      {/* ⑤ 指摘一覧 */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            指摘一覧
            {selectedPhase && (
              <Badge variant="secondary" className="text-xs">{selectedPhase}</Badge>
            )}
            <span className="text-xs text-gray-400 font-normal ml-1">{filteredFindings.length}件</span>
          </CardTitle>
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
                  <TableHead className="text-xs">重大度</TableHead>
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
                    <TableCell className={`text-xs py-2 ${SEVERITY_CLASS[f.severity as QualitySeverity]}`}>
                      {SEVERITY_LABEL[f.severity as QualitySeverity] ?? f.severity}
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

      {/* 閾値設定 */}
      <QualityThresholdSettings projectId={projectId} initialThresholds={initialThresholds} />

      {selectedTarget && (
        <QualityTargetDetailModal
          wbsId={wbsId}
          target={selectedTarget}
          sizeUnit={sizeUnit}
          thresholds={thresholds}
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
