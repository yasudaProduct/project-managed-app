"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Sliders } from "lucide-react";
import type {
  QualityThreshold,
  QualityThresholds,
} from "@/domains/quality/value-objects/quality-threshold";
import { updateQualityThresholds } from "@/app/wbs/[id]/actions/quality-actions";
import { toast } from "@/hooks/use-toast";

type MetricKey = "reviewDensity" | "defectDensity" | "majorDefectDensity";

const METRIC_LABELS: Record<MetricKey, string> = {
  reviewDensity: "レビュー密度",
  defectDensity: "指摘密度",
  majorDefectDensity: "重大指摘密度",
};

const DEFAULT_DIRECTION: Record<MetricKey, boolean> = {
  reviewDensity: true, // 高いほうが良い
  defectDensity: false, // 低いほうが良い
  majorDefectDensity: false,
};

interface Props {
  projectId: string;
  initialThresholds: QualityThresholds;
}

type FormState = Record<MetricKey, { enabled: boolean; warn: string; danger: string; higherIsBetter: boolean }>;

function toFormState(input: QualityThresholds): FormState {
  const build = (key: MetricKey): FormState[MetricKey] => {
    const t = input[key];
    return {
      enabled: !!t,
      warn: t ? String(t.warnThreshold) : "",
      danger: t ? String(t.dangerThreshold) : "",
      higherIsBetter: t ? t.higherIsBetter : DEFAULT_DIRECTION[key],
    };
  };
  return {
    reviewDensity: build("reviewDensity"),
    defectDensity: build("defectDensity"),
    majorDefectDensity: build("majorDefectDensity"),
  };
}

function toThresholds(state: FormState): QualityThresholds | null {
  const result: QualityThresholds = {};
  for (const key of Object.keys(state) as MetricKey[]) {
    const s = state[key];
    if (!s.enabled) continue;
    const warn = Number(s.warn);
    const danger = Number(s.danger);
    if (!Number.isFinite(warn) || !Number.isFinite(danger)) return null;
    const t: QualityThreshold = {
      warnThreshold: warn,
      dangerThreshold: danger,
      higherIsBetter: s.higherIsBetter,
    };
    result[key] = t;
  }
  return result;
}

export function QualityThresholdSettings({ projectId, initialThresholds }: Props) {
  const [state, setState] = useState<FormState>(() => toFormState(initialThresholds));
  const [isSaving, startTransition] = useTransition();

  const update = (key: MetricKey, patch: Partial<FormState[MetricKey]>) => {
    setState((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  };

  const handleSave = () => {
    const thresholds = toThresholds(state);
    if (thresholds === null) {
      toast({
        title: "入力値が不正です",
        description: "有効化した閾値は数値で入力してください",
        variant: "destructive",
      });
      return;
    }
    startTransition(async () => {
      const result = await updateQualityThresholds(projectId, thresholds);
      if (result.success) {
        toast({ title: "閾値を保存しました" });
      } else {
        toast({ title: "保存失敗", description: result.error, variant: "destructive" });
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Sliders className="h-4 w-4" />
          品質閾値設定
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {(Object.keys(METRIC_LABELS) as MetricKey[]).map((key) => {
          const s = state[key];
          return (
            <div key={key} className="border rounded-md p-3 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="font-semibold">{METRIC_LABELS[key]}</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">有効</span>
                  <Switch
                    checked={s.enabled}
                    onCheckedChange={(v) => update(key, { enabled: v })}
                  />
                </div>
              </div>

              {s.enabled && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">警告閾値</Label>
                    <Input
                      type="number"
                      step="0.001"
                      value={s.warn}
                      onChange={(e) => update(key, { warn: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">危険閾値</Label>
                    <Input
                      type="number"
                      step="0.001"
                      value={s.danger}
                      onChange={(e) => update(key, { danger: e.target.value })}
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-5">
                    <Switch
                      checked={s.higherIsBetter}
                      onCheckedChange={(v) => update(key, { higherIsBetter: v })}
                    />
                    <span className="text-sm text-gray-600">
                      {s.higherIsBetter ? "高いほど良い" : "低いほど良い"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving}>
            保存
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
