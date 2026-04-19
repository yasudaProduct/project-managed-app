"use client";

import { useState, useTransition } from "react";
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
import type { QualityTargetListItem } from "@/applications/quality/quality-application.service";
import { syncQualityTargets } from "@/app/wbs/[id]/actions/quality-actions";
import { toast } from "@/hooks/use-toast";
import { QualityTargetDetailModal } from "./quality-target-detail-modal";
import { QualityImportExport } from "./quality-import-export";

type SizeUnitOption = QualitySizeUnit | "MAN_HOUR";

const SIZE_UNIT_LABELS: Record<SizeUnitOption, string> = {
  MAN_HOUR: "工数 (人時)",
  [QualitySizeUnit.PAGE]: "ページ数",
  [QualitySizeUnit.LINES_OF_CODE]: "ステップ数",
  [QualitySizeUnit.TEST_CASE]: "テストケース数",
};

interface QualityDashboardProps {
  wbsId: number;
  initialTargets: QualityTargetListItem[];
}

export function QualityDashboard({ wbsId, initialTargets }: QualityDashboardProps) {
  const [targets, setTargets] = useState<QualityTargetListItem[]>(initialTargets);
  const [sizeUnit, setSizeUnit] = useState<SizeUnitOption>("MAN_HOUR");
  const [selectedTarget, setSelectedTarget] = useState<QualityTargetListItem | null>(null);
  const [isSyncing, startSyncTransition] = useTransition();

  const handleSync = () => {
    startSyncTransition(async () => {
      const result = await syncQualityTargets(wbsId);
      if (result.success && result.data) {
        toast({
          title: "同期完了",
          description: `新規: ${result.data.created}件 / 更新: ${result.data.updated}件 / 無効化: ${result.data.deactivated}件`,
        });
      } else {
        toast({
          title: "同期に失敗しました",
          description: result.error,
          variant: "destructive",
        });
      }
    });
  };

  const activeTargets = targets.filter((t) => t.isActive);
  const totalFindings = activeTargets.reduce((sum, t) => sum + t.findingCount, 0);
  const totalMajor = activeTargets.reduce((sum, t) => sum + t.majorCount, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-600">評価対象</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{activeTargets.length}</p>
            <p className="text-xs text-gray-500 mt-1">有効な評価対象数</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-600">指摘件数</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalFindings}</p>
            <p className="text-xs text-gray-500 mt-1">全評価対象の指摘合計</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-600">重大指摘件数</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">{totalMajor}</p>
            <p className="text-xs text-gray-500 mt-1">Major指摘の合計</p>
          </CardContent>
        </Card>
      </div>

      <QualityImportExport wbsId={wbsId} sizeUnit={sizeUnit} />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg flex items-center gap-2">
            <ListChecks className="h-5 w-5" />
            評価対象一覧
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <Ruler className="h-4 w-4 text-gray-500" />
              <Select value={sizeUnit} onValueChange={(v) => setSizeUnit(v as SizeUnitOption)}>
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
          {targets.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>評価対象がまだ登録されていません。</p>
              <p className="text-sm mt-1">
                WBSからインポート後に「WBSから同期」を実行してください。
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>タスクNo.</TableHead>
                  <TableHead>タスク名</TableHead>
                  <TableHead className="text-right">レビュアー数</TableHead>
                  <TableHead className="text-right">指摘件数</TableHead>
                  <TableHead className="text-right">重大指摘</TableHead>
                  <TableHead>状態</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {targets.map((t) => (
                  <TableRow key={t.id} className={!t.isActive ? "opacity-50" : undefined}>
                    <TableCell className="font-mono text-xs">{t.taskNo}</TableCell>
                    <TableCell>{t.name}</TableCell>
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
          onClose={() => setSelectedTarget(null)}
          onChanged={(updated) => {
            setTargets((prev) =>
              prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)),
            );
          }}
        />
      )}
    </div>
  );
}
