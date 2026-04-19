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
import { RefreshCw, ListChecks, Ruler } from "lucide-react";
import { QualitySizeUnit } from "@/domains/quality/value-objects/quality-enums";
import type {
  QualityTargetListItem,
  WbsQualitySummary,
  QualityTrendPoint,
} from "@/applications/quality/quality-application.service";
import {
  syncQualityTargets,
  getWbsQualitySummary,
  getQualityTrend,
  getQualityTargets,
} from "@/app/wbs/[id]/actions/quality-actions";
import { toast } from "@/hooks/use-toast";
import { QualityTargetDetailModal } from "./quality-target-detail-modal";
import { QualityImportExport } from "./quality-import-export";
import { QualityThresholdSettings } from "./quality-threshold-settings";
import { QualityIndicatorCards } from "./quality-indicator-cards";
import { QualityTrendChart } from "./quality-trend-chart";
import {
  QualityFilterPanel,
  type QualityFilter,
} from "./quality-filter-panel";
import type { QualityThresholds } from "@/domains/quality/value-objects/quality-threshold";

type SizeUnitOption = QualitySizeUnit | "MAN_HOUR";

const SIZE_UNIT_LABELS: Record<SizeUnitOption, string> = {
  MAN_HOUR: "工数 (人時)",
  [QualitySizeUnit.PAGE]: "ページ数",
  [QualitySizeUnit.LINES_OF_CODE]: "ステップ数",
  [QualitySizeUnit.TEST_CASE]: "テストケース数",
};

interface QualityDashboardProps {
  wbsId: number;
  projectId: string;
  initialTargets: QualityTargetListItem[];
  initialThresholds: QualityThresholds;
  initialSummary: WbsQualitySummary;
  initialTrend: QualityTrendPoint[];
}

export function QualityDashboard({
  wbsId,
  projectId,
  initialTargets,
  initialThresholds,
  initialSummary,
  initialTrend,
}: QualityDashboardProps) {
  const [targets, setTargets] = useState<QualityTargetListItem[]>(initialTargets);
  const [summary, setSummary] = useState<WbsQualitySummary>(initialSummary);
  const [trend, setTrend] = useState<QualityTrendPoint[]>(initialTrend);
  const [sizeUnit, setSizeUnit] = useState<SizeUnitOption>("MAN_HOUR");
  const [selectedTarget, setSelectedTarget] = useState<QualityTargetListItem | null>(null);
  const [filter, setFilter] = useState<QualityFilter>({
    fromDate: "",
    toDate: "",
    phase: "",
  });
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
    return targets.filter((t) => {
      if (filter.phase && t.phase !== filter.phase) return false;
      return true;
    });
  }, [targets, filter.phase]);

  const refreshAll = (unit: SizeUnitOption, f: QualityFilter) => {
    startRefreshTransition(async () => {
      const [newSummary, newTrend, newTargets] = await Promise.all([
        getWbsQualitySummary(wbsId, unit, thresholds),
        getQualityTrend(wbsId, unit, f.fromDate || undefined, f.toDate || undefined),
        getQualityTargets(wbsId),
      ]);
      setSummary(newSummary);
      setTrend(newTrend);
      setTargets(newTargets);
    });
  };

  const handleSizeUnitChange = (v: string) => {
    const unit = v as SizeUnitOption;
    setSizeUnit(unit);
    refreshAll(unit, filter);
  };

  const handleFilterChange = (f: QualityFilter) => {
    setFilter(f);
    refreshAll(sizeUnit, f);
  };

  const handleSync = () => {
    startSyncTransition(async () => {
      const result = await syncQualityTargets(wbsId);
      if (result.success && result.data) {
        toast({
          title: "同期完了",
          description: `新規: ${result.data.created}件 / 更新: ${result.data.updated}件 / 無効化: ${result.data.deactivated}件`,
        });
        refreshAll(sizeUnit, filter);
      } else {
        toast({
          title: "同期に失敗しました",
          description: result.error,
          variant: "destructive",
        });
      }
    });
  };

  return (
    <div className="space-y-6">
      <QualityFilterPanel value={filter} onChange={handleFilterChange} phases={phases} />

      <QualityIndicatorCards summary={summary} />

      <QualityTrendChart data={trend} thresholds={thresholds} />

      <QualityImportExport wbsId={wbsId} sizeUnit={sizeUnit} />

      <QualityThresholdSettings
        projectId={projectId}
        initialThresholds={initialThresholds}
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg flex items-center gap-2">
            <ListChecks className="h-5 w-5" />
            評価対象一覧
            {isRefreshing && (
              <span className="text-xs text-gray-500">（更新中...）</span>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <Ruler className="h-4 w-4 text-gray-500" />
              <Select value={sizeUnit} onValueChange={handleSizeUnitChange}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SIZE_UNIT_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={isSyncing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? "animate-spin" : ""}`} />
              WBSから同期
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {filteredTargets.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>評価対象がありません。</p>
              <p className="text-sm mt-1">
                WBSからインポート後に「WBSから同期」を実行するか、フィルタ条件を見直してください。
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>タスクNo.</TableHead>
                  <TableHead>タスク名</TableHead>
                  <TableHead>フェーズ</TableHead>
                  <TableHead className="text-right">レビュアー数</TableHead>
                  <TableHead className="text-right">指摘件数</TableHead>
                  <TableHead className="text-right">重大指摘</TableHead>
                  <TableHead>状態</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTargets.map((t) => (
                  <TableRow key={t.id} className={!t.isActive ? "opacity-50" : undefined}>
                    <TableCell className="font-mono text-xs">{t.taskNo}</TableCell>
                    <TableCell>{t.name}</TableCell>
                    <TableCell className="text-xs text-gray-600">
                      {t.phase ?? "-"}
                    </TableCell>
                    <TableCell className="text-right">{t.reviewerCount}</TableCell>
                    <TableCell className="text-right">{t.findingCount}</TableCell>
                    <TableCell className="text-right">
                      {t.majorCount > 0 ? (
                        <span className="text-red-600 font-semibold">{t.majorCount}</span>
                      ) : (
                        t.majorCount
                      )}
                    </TableCell>
                    <TableCell>
                      {t.isActive ? (
                        <Badge variant="default">有効</Badge>
                      ) : (
                        <Badge variant="secondary">無効</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
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
            refreshAll(sizeUnit, filter);
          }}
        />
      )}
    </div>
  );
}
