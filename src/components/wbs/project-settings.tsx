"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useEffect, useState, useTransition } from "react";
import {
  getProjectSettings,
  updateProjectSettings,
} from "@/app/wbs/[id]/project-settings-actions";
import type { ProgressMeasurementMethod } from "@/types/progress-measurement";
import {
  PROGRESS_MEASUREMENT_METHOD_LABELS,
  PROGRESS_MEASUREMENT_METHOD_DESCRIPTIONS,
} from "@/types/progress-measurement";
import type { ForecastCalculationMethod } from "@/types/forecast-calculation-method";
import {
  FORECAST_CALCULATION_METHOD_LABELS,
  FORECAST_CALCULATION_METHOD_DESCRIPTIONS,
} from "@/types/forecast-calculation-method";

interface ProjectSettingsProps {
  projectId: string;
}

export function ProjectSettings({ projectId }: ProjectSettingsProps) {
  const [roundToQuarter, setRoundToQuarter] = useState<boolean>(false);
  const [progressMeasurementMethod, setProgressMeasurementMethod] =
    useState<ProgressMeasurementMethod>("SELF_REPORTED");
  const [forecastCalculationMethod, setForecastCalculationMethod] =
    useState<ForecastCalculationMethod>("REALISTIC");
  const [saving, startTransition] = useTransition();

  useEffect(() => {
    (async () => {
      try {
        const data = await getProjectSettings(projectId);
        setRoundToQuarter(Boolean(data?.roundToQuarter));
        setProgressMeasurementMethod(
          data?.progressMeasurementMethod || "SELF_REPORTED"
        );
        setForecastCalculationMethod(
          data?.forecastCalculationMethod || "REALISTIC"
        );
      } catch {}
    })();
  }, [projectId]);

  const onToggle = (value: boolean) => {
    setRoundToQuarter(value);
    startTransition(async () => {
      await updateProjectSettings(
        projectId,
        value,
        progressMeasurementMethod,
        forecastCalculationMethod
      );
    });
  };

  const onProgressMethodChange = (value: ProgressMeasurementMethod) => {
    setProgressMeasurementMethod(value);
    startTransition(async () => {
      await updateProjectSettings(
        projectId,
        roundToQuarter,
        value,
        forecastCalculationMethod
      );
    });
  };

  const onForecastMethodChange = (value: ForecastCalculationMethod) => {
    setForecastCalculationMethod(value);
    startTransition(async () => {
      await updateProjectSettings(
        projectId,
        roundToQuarter,
        progressMeasurementMethod,
        value
      );
    });
  };

  return (
    <Card className="rounded-none shadow-none">
      <CardHeader>
        <CardTitle className="text-lg">プロジェクト設定</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 進捗測定方式 */}
        <div className="space-y-3">
          <div>
            <Label className="text-base font-medium">進捗測定方式</Label>
            <div className="text-sm text-gray-500 mt-1">
              タスクの進捗率をどのように測定するかを選択します。見通し工数算出やEVMで使用されます。
            </div>
          </div>
          <RadioGroup
            value={progressMeasurementMethod}
            onValueChange={(value) =>
              onProgressMethodChange(value as ProgressMeasurementMethod)
            }
            name="progressMeasurementMethod"
          >
            <div className="flex items-start space-x-3">
              <RadioGroupItem
                value="ZERO_HUNDRED"
                id="progress-zero-hundred"
                disabled={saving}
              />
              <Label htmlFor="progress-zero-hundred" className="cursor-pointer">
                <div className="flex flex-col">
                  <span className="font-medium">
                    {PROGRESS_MEASUREMENT_METHOD_LABELS.ZERO_HUNDRED}
                  </span>
                  <span className="text-xs text-gray-500 font-normal">
                    {PROGRESS_MEASUREMENT_METHOD_DESCRIPTIONS.ZERO_HUNDRED}
                  </span>
                </div>
              </Label>
            </div>
            <div className="flex items-start space-x-3">
              <RadioGroupItem
                value="FIFTY_FIFTY"
                id="progress-fifty-fifty"
                disabled={saving}
              />
              <Label htmlFor="progress-fifty-fifty" className="cursor-pointer">
                <div className="flex flex-col">
                  <span className="font-medium">
                    {PROGRESS_MEASUREMENT_METHOD_LABELS.FIFTY_FIFTY}
                  </span>
                  <span className="text-xs text-gray-500 font-normal">
                    {PROGRESS_MEASUREMENT_METHOD_DESCRIPTIONS.FIFTY_FIFTY}
                  </span>
                </div>
              </Label>
            </div>
            <div className="flex items-start space-x-3">
              <RadioGroupItem
                value="SELF_REPORTED"
                id="progress-self-reported"
                disabled={saving}
              />
              <Label htmlFor="progress-self-reported" className="cursor-pointer">
                <div className="flex flex-col">
                  <span className="font-medium">
                    {PROGRESS_MEASUREMENT_METHOD_LABELS.SELF_REPORTED}
                  </span>
                  <span className="text-xs text-gray-500 font-normal">
                    {PROGRESS_MEASUREMENT_METHOD_DESCRIPTIONS.SELF_REPORTED}
                  </span>
                </div>
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* 見通し工数算出方式 */}
        <div className="space-y-3">
          <div>
            <Label className="text-base font-medium">見通し工数算出方式</Label>
            <div className="text-sm text-gray-500 mt-1">
              タスクの見通し工数をどのように計算するかを選択します。WBSサマリーの見通し工数に使用されます。
            </div>
          </div>
          <RadioGroup
            value={forecastCalculationMethod}
            onValueChange={(value) =>
              onForecastMethodChange(value as ForecastCalculationMethod)
            }
            name="forecastCalculationMethod"
          >
            <div className="flex items-start space-x-3">
              <RadioGroupItem
                value="CONSERVATIVE"
                id="forecast-conservative"
                disabled={saving}
              />
              <Label htmlFor="forecast-conservative" className="cursor-pointer">
                <div className="flex flex-col">
                  <span className="font-medium">
                    {FORECAST_CALCULATION_METHOD_LABELS.CONSERVATIVE}
                  </span>
                  <span className="text-xs text-gray-500 font-normal">
                    {FORECAST_CALCULATION_METHOD_DESCRIPTIONS.CONSERVATIVE}
                  </span>
                </div>
              </Label>
            </div>
            <div className="flex items-start space-x-3">
              <RadioGroupItem
                value="REALISTIC"
                id="forecast-realistic"
                disabled={saving}
              />
              <Label htmlFor="forecast-realistic" className="cursor-pointer">
                <div className="flex flex-col">
                  <span className="font-medium">
                    {FORECAST_CALCULATION_METHOD_LABELS.REALISTIC}
                  </span>
                  <span className="text-xs text-gray-500 font-normal">
                    {FORECAST_CALCULATION_METHOD_DESCRIPTIONS.REALISTIC}
                  </span>
                </div>
              </Label>
            </div>
            <div className="flex items-start space-x-3">
              <RadioGroupItem
                value="OPTIMISTIC"
                id="forecast-optimistic"
                disabled={saving}
              />
              <Label htmlFor="forecast-optimistic" className="cursor-pointer">
                <div className="flex flex-col">
                  <span className="font-medium">
                    {FORECAST_CALCULATION_METHOD_LABELS.OPTIMISTIC}
                  </span>
                  <span className="text-xs text-gray-500 font-normal">
                    {FORECAST_CALCULATION_METHOD_DESCRIPTIONS.OPTIMISTIC}
                  </span>
                </div>
              </Label>
            </div>
            <div className="flex items-start space-x-3">
              <RadioGroupItem
                value="PLANNED_OR_ACTUAL"
                id="forecast-planned-or-actual"
                disabled={saving}
              />
              <Label htmlFor="forecast-planned-or-actual" className="cursor-pointer">
                <div className="flex flex-col">
                  <span className="font-medium">
                    {FORECAST_CALCULATION_METHOD_LABELS.PLANNED_OR_ACTUAL}
                  </span>
                  <span className="text-xs text-gray-500 font-normal">
                    {FORECAST_CALCULATION_METHOD_DESCRIPTIONS.PLANNED_OR_ACTUAL}
                  </span>
                </div>
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* 月跨ぎ按分の最小単位 */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div>
            <Label htmlFor="roundToQuarter" className="text-base font-medium">
              月跨ぎ按分の最小単位を0.25にする
            </Label>
            <div className="text-sm text-gray-500 mt-1">
              オフ: 現行の按分（小数をそのまま） / オン:
              0.25単位に調整（剰余は月に寄せる）
            </div>
          </div>
          <Switch
            id="roundToQuarter"
            checked={roundToQuarter}
            onCheckedChange={onToggle}
            disabled={saving}
          />
        </div>
      </CardContent>
    </Card>
  );
}
