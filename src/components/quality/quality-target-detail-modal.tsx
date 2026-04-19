"use client";

import { useEffect, useState, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { QualitySizeUnit, QualitySeverity } from "@/domains/quality/value-objects/quality-enums";
import type {
  QualityMetricsSummary,
  QualityTargetListItem,
} from "@/applications/quality/quality-application.service";
import type { QualityThresholds } from "@/domains/quality/value-objects/quality-threshold";
import {
  getQualityFindings,
  getQualitySizeMetrics,
  getQualitySummary,
  registerQualityFinding,
  deleteQualityFinding,
  registerQualitySizeMetric,
  deleteQualitySizeMetric,
} from "@/app/wbs/[id]/actions/quality-actions";
import { toast } from "@/hooks/use-toast";
import { QualityStatus } from "@/domains/quality/value-objects/quality-status";

type SizeUnitOption = QualitySizeUnit | "MAN_HOUR";

const SEVERITY_LABELS: Record<QualitySeverity, string> = {
  [QualitySeverity.MAJOR]: "重大",
  [QualitySeverity.MINOR]: "軽微",
  [QualitySeverity.INFO]: "情報",
};

const UNIT_LABELS: Record<QualitySizeUnit, string> = {
  [QualitySizeUnit.PAGE]: "ページ",
  [QualitySizeUnit.LINES_OF_CODE]: "ステップ",
  [QualitySizeUnit.TEST_CASE]: "テストケース",
};

interface FindingRow {
  id: number;
  targetId: number;
  severity: QualitySeverity;
  category: string | null;
  description: string | null;
  foundAt: string;
}

interface SizeMetricRow {
  id: number;
  targetId: number;
  unit: QualitySizeUnit;
  value: number;
  measuredAt: string;
  note: string | null;
}

interface Props {
  wbsId: number;
  target: QualityTargetListItem;
  sizeUnit: SizeUnitOption;
  thresholds?: QualityThresholds;
  onClose: () => void;
  onChanged: (updated: QualityTargetListItem) => void;
}

function formatNumber(n: number | null, digits = 3): string {
  if (n === null || Number.isNaN(n)) return "-";
  return n.toFixed(digits);
}

function statusBadge(status: QualityStatus | null) {
  if (!status) return <Badge variant="secondary">-</Badge>;
  switch (status) {
    case QualityStatus.NORMAL:
      return <Badge className="bg-green-500">正常</Badge>;
    case QualityStatus.WARNING:
      return <Badge className="bg-yellow-500">警告</Badge>;
    case QualityStatus.DANGER:
      return <Badge className="bg-red-500">危険</Badge>;
  }
}

export function QualityTargetDetailModal({
  wbsId,
  target,
  sizeUnit,
  thresholds,
  onClose,
  onChanged,
}: Props) {
  const [summary, setSummary] = useState<QualityMetricsSummary | null>(null);
  const [findings, setFindings] = useState<FindingRow[]>([]);
  const [sizeMetrics, setSizeMetrics] = useState<SizeMetricRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [, startTransition] = useTransition();

  const [newFinding, setNewFinding] = useState({
    severity: QualitySeverity.MAJOR as QualitySeverity,
    category: "",
    description: "",
    foundAt: new Date().toISOString().split("T")[0],
  });

  const [newSize, setNewSize] = useState({
    unit: QualitySizeUnit.PAGE as QualitySizeUnit,
    value: "",
    measuredAt: new Date().toISOString().split("T")[0],
    note: "",
  });

  const reload = async () => {
    setLoading(true);
    const [s, f, m] = await Promise.all([
      getQualitySummary(target.id, sizeUnit, thresholds),
      getQualityFindings(target.id),
      getQualitySizeMetrics(target.id),
    ]);
    setSummary(s);
    setFindings(f);
    setSizeMetrics(m);
    setLoading(false);
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target.id, sizeUnit, thresholds]);

  const handleAddFinding = () => {
    startTransition(async () => {
      const result = await registerQualityFinding(wbsId, {
        targetId: target.id,
        severity: newFinding.severity,
        category: newFinding.category || undefined,
        description: newFinding.description || undefined,
        foundAt: new Date(newFinding.foundAt).toISOString(),
      });
      if (result.success) {
        toast({ title: "指摘を登録しました" });
        setNewFinding({
          severity: QualitySeverity.MAJOR,
          category: "",
          description: "",
          foundAt: new Date().toISOString().split("T")[0],
        });
        await reload();
        onChanged({
          ...target,
          findingCount: target.findingCount + 1,
          majorCount:
            newFinding.severity === QualitySeverity.MAJOR
              ? target.majorCount + 1
              : target.majorCount,
        });
      } else {
        toast({ title: "登録失敗", description: result.error, variant: "destructive" });
      }
    });
  };

  const handleDeleteFinding = (id: number, severity: QualitySeverity) => {
    startTransition(async () => {
      const result = await deleteQualityFinding(wbsId, id);
      if (result.success) {
        toast({ title: "指摘を削除しました" });
        await reload();
        onChanged({
          ...target,
          findingCount: Math.max(0, target.findingCount - 1),
          majorCount:
            severity === QualitySeverity.MAJOR
              ? Math.max(0, target.majorCount - 1)
              : target.majorCount,
        });
      } else {
        toast({ title: "削除失敗", description: result.error, variant: "destructive" });
      }
    });
  };

  const handleAddSize = () => {
    const value = Number(newSize.value);
    if (!Number.isFinite(value) || value <= 0) {
      toast({ title: "規模値は正の数を入力してください", variant: "destructive" });
      return;
    }
    startTransition(async () => {
      const result = await registerQualitySizeMetric(wbsId, {
        targetId: target.id,
        unit: newSize.unit,
        value,
        measuredAt: new Date(newSize.measuredAt).toISOString(),
        note: newSize.note || undefined,
      });
      if (result.success) {
        toast({ title: "規模を登録しました" });
        setNewSize({
          unit: QualitySizeUnit.PAGE,
          value: "",
          measuredAt: new Date().toISOString().split("T")[0],
          note: "",
        });
        await reload();
      } else {
        toast({ title: "登録失敗", description: result.error, variant: "destructive" });
      }
    });
  };

  const handleDeleteSize = (unit: QualitySizeUnit) => {
    startTransition(async () => {
      const result = await deleteQualitySizeMetric(wbsId, target.id, unit);
      if (result.success) {
        toast({ title: "規模を削除しました" });
        await reload();
      } else {
        toast({ title: "削除失敗", description: result.error, variant: "destructive" });
      }
    });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="font-mono text-sm text-gray-500">{target.taskNo}</span>
            <span>{target.name}</span>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="summary" className="mt-4">
          <TabsList>
            <TabsTrigger value="summary">サマリ</TabsTrigger>
            <TabsTrigger value="findings">指摘</TabsTrigger>
            <TabsTrigger value="size">規模</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="space-y-4">
            {loading || !summary ? (
              <p className="text-gray-500">読み込み中...</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <MetricCard label="規模" value={`${formatNumber(summary.size, 2)} ${summary.sizeUnit === "MAN_HOUR" ? "人時" : UNIT_LABELS[summary.sizeUnit]}`} />
                <MetricCard label="レビュー工数" value={`${formatNumber(summary.reviewManHours, 2)} 人時`} />
                <MetricCard label="指摘件数" value={`${summary.findingCount} 件`} />
                <MetricCard label="重大指摘件数" value={`${summary.majorCount} 件`} />
                <MetricCard label="レビュー密度" value={formatNumber(summary.reviewDensity)} />
                <MetricCard label="指摘密度" value={formatNumber(summary.defectDensity)} />
                <MetricCard label="重大指摘密度" value={formatNumber(summary.majorDefectDensity)} />
                <MetricCard
                  label="重大指摘比率"
                  value={
                    summary.majorRatio !== null
                      ? `${(summary.majorRatio * 100).toFixed(1)}%`
                      : "-"
                  }
                />
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs text-gray-600">ステータス</CardTitle>
                  </CardHeader>
                  <CardContent>{statusBadge(summary.status)}</CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="findings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">指摘を追加</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>重大度</Label>
                    <Select
                      value={newFinding.severity}
                      onValueChange={(v) =>
                        setNewFinding({ ...newFinding, severity: v as QualitySeverity })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(SEVERITY_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>発見日</Label>
                    <Input
                      type="date"
                      value={newFinding.foundAt}
                      onChange={(e) =>
                        setNewFinding({ ...newFinding, foundAt: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div>
                  <Label>カテゴリ</Label>
                  <Input
                    value={newFinding.category}
                    onChange={(e) =>
                      setNewFinding({ ...newFinding, category: e.target.value })
                    }
                    placeholder="例: 仕様漏れ"
                  />
                </div>
                <div>
                  <Label>内容</Label>
                  <Textarea
                    value={newFinding.description}
                    onChange={(e) =>
                      setNewFinding({ ...newFinding, description: e.target.value })
                    }
                    rows={2}
                  />
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleAddFinding}>追加</Button>
                </div>
              </CardContent>
            </Card>

            <div>
              <h3 className="text-sm font-semibold mb-2">登録済み指摘 ({findings.length})</h3>
              {findings.length === 0 ? (
                <p className="text-sm text-gray-500">指摘はまだありません。</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>発見日</TableHead>
                      <TableHead>重大度</TableHead>
                      <TableHead>カテゴリ</TableHead>
                      <TableHead>内容</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {findings.map((f) => (
                      <TableRow key={f.id}>
                        <TableCell>{f.foundAt.split("T")[0]}</TableCell>
                        <TableCell>
                          <Badge
                            variant={f.severity === QualitySeverity.MAJOR ? "destructive" : "secondary"}
                          >
                            {SEVERITY_LABELS[f.severity]}
                          </Badge>
                        </TableCell>
                        <TableCell>{f.category ?? "-"}</TableCell>
                        <TableCell className="max-w-xs truncate">{f.description ?? "-"}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteFinding(f.id, f.severity)}
                          >
                            削除
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </TabsContent>

          <TabsContent value="size" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">規模を登録</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>単位</Label>
                    <Select
                      value={newSize.unit}
                      onValueChange={(v) => setNewSize({ ...newSize, unit: v as QualitySizeUnit })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(UNIT_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>値</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={newSize.value}
                      onChange={(e) => setNewSize({ ...newSize, value: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label>測定日</Label>
                  <Input
                    type="date"
                    value={newSize.measuredAt}
                    onChange={(e) => setNewSize({ ...newSize, measuredAt: e.target.value })}
                  />
                </div>
                <div>
                  <Label>メモ</Label>
                  <Textarea
                    value={newSize.note}
                    onChange={(e) => setNewSize({ ...newSize, note: e.target.value })}
                    rows={2}
                  />
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleAddSize}>登録</Button>
                </div>
              </CardContent>
            </Card>

            <div>
              <h3 className="text-sm font-semibold mb-2">登録済み規模 ({sizeMetrics.length})</h3>
              {sizeMetrics.length === 0 ? (
                <p className="text-sm text-gray-500">規模はまだ登録されていません。</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>測定日</TableHead>
                      <TableHead>単位</TableHead>
                      <TableHead className="text-right">値</TableHead>
                      <TableHead>メモ</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sizeMetrics.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell>{m.measuredAt.split("T")[0]}</TableCell>
                        <TableCell>{UNIT_LABELS[m.unit]}</TableCell>
                        <TableCell className="text-right">{m.value}</TableCell>
                        <TableCell className="max-w-xs truncate">{m.note ?? "-"}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteSize(m.unit)}
                          >
                            削除
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs text-gray-600">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-lg font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}
