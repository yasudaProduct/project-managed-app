"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useEffect, useState, useTransition } from "react";
import {
  getProjectSettings,
  updateProjectSettings,
  updateDashboardSettings,
  getSchedulingSettings,
  updateSchedulingSettings,
} from "@/app/wbs/[id]/project-settings-actions";
import type {
  SchedulingSettings,
  SteadyDailyHoursMode,
} from "@/types/scheduling-settings";
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
import type { EvmForecastMethod } from "@/types/evm-forecast-method";
import {
  EVM_FORECAST_METHOD_LABELS,
  EVM_FORECAST_METHOD_DESCRIPTIONS,
} from "@/types/evm-forecast-method";

interface ProjectSettingsProps {
  projectId: string;
}

export function ProjectSettings({ projectId }: ProjectSettingsProps) {
  const [roundToQuarter, setRoundToQuarter] = useState<boolean>(false);
  const [progressMeasurementMethod, setProgressMeasurementMethod] =
    useState<ProgressMeasurementMethod>("SELF_REPORTED");
  const [forecastCalculationMethod, setForecastCalculationMethod] =
    useState<ForecastCalculationMethod>("REALISTIC");
  const [evmForecastMethod, setEvmForecastMethod] =
    useState<EvmForecastMethod>("CPI_ONLY");
  const [deadlineAlertDays, setDeadlineAlertDays] = useState<number>(1);
  const [costOverrunThresholdPct, setCostOverrunThresholdPct] =
    useState<number>(100);
  const [steadyKeywordsText, setSteadyKeywordsText] = useState<string>("");
  const [consumeSteadyTaskCapacity, setConsumeSteadyTaskCapacity] =
    useState<boolean>(false);
  const [steadyDailyHoursMode, setSteadyDailyHoursMode] =
    useState<SteadyDailyHoursMode>("PRORATE");
  const [steadyFixedHours, setSteadyFixedHours] = useState<
    Record<string, number>
  >({});
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
        if ("evmForecastMethod" in data && data.evmForecastMethod) {
          setEvmForecastMethod(data.evmForecastMethod as EvmForecastMethod);
        }
        if ("deadlineAlertDays" in data) {
          setDeadlineAlertDays(data.deadlineAlertDays as number);
        }
        if ("costOverrunThresholdPct" in data) {
          setCostOverrunThresholdPct(data.costOverrunThresholdPct as number);
        }
        const sched = await getSchedulingSettings(projectId);
        setSteadyKeywordsText(sched.steadyTaskKeywords.join("\n"));
        setConsumeSteadyTaskCapacity(sched.consumeSteadyTaskCapacity);
        setSteadyDailyHoursMode(sched.steadyDailyHoursMode);
        setSteadyFixedHours(sched.steadyFixedHoursByKeyword ?? {});
      } catch {}
    })();
  }, [projectId]);

  const parseKeywords = (text: string): string[] =>
    text
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

  const buildSchedulingSettings = (
    override: Partial<SchedulingSettings>
  ): SchedulingSettings => {
    const keywords = parseKeywords(steadyKeywordsText);
    // 現在のキーワードに存在するキーのみ固定値を残す
    const fixedHours: Record<string, number> = {};
    for (const kw of keywords) {
      const v = steadyFixedHours[kw];
      if (typeof v === "number" && Number.isFinite(v)) {
        fixedHours[kw] = v;
      }
    }
    return {
      steadyTaskKeywords: keywords,
      consumeSteadyTaskCapacity,
      steadyDailyHoursMode,
      steadyFixedHoursByKeyword: fixedHours,
      ...override,
    };
  };

  const onConsumeSteadyToggle = (value: boolean) => {
    setConsumeSteadyTaskCapacity(value);
    startTransition(async () => {
      await updateSchedulingSettings(
        projectId,
        buildSchedulingSettings({ consumeSteadyTaskCapacity: value })
      );
    });
  };

  const onSteadyModeChange = (value: SteadyDailyHoursMode) => {
    setSteadyDailyHoursMode(value);
    startTransition(async () => {
      await updateSchedulingSettings(
        projectId,
        buildSchedulingSettings({ steadyDailyHoursMode: value })
      );
    });
  };

  const onSteadyKeywordsBlur = () => {
    startTransition(async () => {
      await updateSchedulingSettings(projectId, buildSchedulingSettings({}));
    });
  };

  const onSteadyFixedHourChange = (keyword: string, value: number) => {
    setSteadyFixedHours((prev) => ({ ...prev, [keyword]: value }));
  };

  const onSteadyFixedHoursBlur = () => {
    startTransition(async () => {
      await updateSchedulingSettings(projectId, buildSchedulingSettings({}));
    });
  };

  const onToggle = (value: boolean) => {
    setRoundToQuarter(value);
    startTransition(async () => {
      await updateProjectSettings(
        projectId,
        value,
        progressMeasurementMethod,
        forecastCalculationMethod,
        evmForecastMethod
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
        forecastCalculationMethod,
        evmForecastMethod
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
        value,
        evmForecastMethod
      );
    });
  };

  const onEvmForecastMethodChange = (value: EvmForecastMethod) => {
    setEvmForecastMethod(value);
    startTransition(async () => {
      await updateProjectSettings(
        projectId,
        roundToQuarter,
        progressMeasurementMethod,
        forecastCalculationMethod,
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

        {/* EVM予測計算方式 */}
        <div className="space-y-3">
          <div>
            <Label className="text-base font-medium">EVM予測計算方式</Label>
            <div className="text-sm text-gray-500 mt-1">
              EVM指標のEAC（完了時総コスト予測）・ETC（残コスト予測）の算出方式を選択します。
            </div>
          </div>
          <RadioGroup
            value={evmForecastMethod}
            onValueChange={(value) =>
              onEvmForecastMethodChange(value as EvmForecastMethod)
            }
            name="evmForecastMethod"
          >
            <div className="flex items-start space-x-3">
              <RadioGroupItem
                value="CPI_ONLY"
                id="evm-forecast-cpi-only"
                disabled={saving}
              />
              <Label htmlFor="evm-forecast-cpi-only" className="cursor-pointer">
                <div className="flex flex-col">
                  <span className="font-medium">
                    {EVM_FORECAST_METHOD_LABELS.CPI_ONLY}
                  </span>
                  <span className="text-xs text-gray-500 font-normal">
                    {EVM_FORECAST_METHOD_DESCRIPTIONS.CPI_ONLY}
                  </span>
                </div>
              </Label>
            </div>
            <div className="flex items-start space-x-3">
              <RadioGroupItem
                value="CPI_SPI"
                id="evm-forecast-cpi-spi"
                disabled={saving}
              />
              <Label htmlFor="evm-forecast-cpi-spi" className="cursor-pointer">
                <div className="flex flex-col">
                  <span className="font-medium">
                    {EVM_FORECAST_METHOD_LABELS.CPI_SPI}
                  </span>
                  <span className="text-xs text-gray-500 font-normal">
                    {EVM_FORECAST_METHOD_DESCRIPTIONS.CPI_SPI}
                  </span>
                </div>
              </Label>
            </div>
            <div className="flex items-start space-x-3">
              <RadioGroupItem
                value="PLANNED"
                id="evm-forecast-planned"
                disabled={saving}
              />
              <Label htmlFor="evm-forecast-planned" className="cursor-pointer">
                <div className="flex flex-col">
                  <span className="font-medium">
                    {EVM_FORECAST_METHOD_LABELS.PLANNED}
                  </span>
                  <span className="text-xs text-gray-500 font-normal">
                    {EVM_FORECAST_METHOD_DESCRIPTIONS.PLANNED}
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

        {/* ダッシュボード設定 */}
        <div className="space-y-4 pt-4 border-t">
          <div>
            <Label className="text-base font-medium">ダッシュボード設定</Label>
            <div className="text-sm text-gray-500 mt-1">
              サマリータブに表示するアラートの閾値を設定します。
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label
                htmlFor="deadlineAlertDays"
                className="text-sm font-medium"
              >
                期限間近アラート（日数）
              </Label>
              <div className="text-xs text-gray-500 mt-0.5">
                予定終了日の何日前からタスクを表示するか
              </div>
            </div>
            <Input
              id="deadlineAlertDays"
              type="number"
              min={0}
              max={365}
              value={deadlineAlertDays}
              onChange={(e) => {
                const value = parseInt(e.target.value, 10);
                if (isNaN(value) || value < 0) return;
                setDeadlineAlertDays(value);
              }}
              onBlur={() => {
                startTransition(async () => {
                  await updateDashboardSettings(
                    projectId,
                    deadlineAlertDays,
                    costOverrunThresholdPct
                  );
                });
              }}
              className="w-20 text-right"
              disabled={saving}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label
                htmlFor="costOverrunThresholdPct"
                className="text-sm font-medium"
              >
                工数超過アラート（%）
              </Label>
              <div className="text-xs text-gray-500 mt-0.5">
                予定工数の何%以上で超過タスクとして表示するか
              </div>
            </div>
            <Input
              id="costOverrunThresholdPct"
              type="number"
              min={0}
              max={1000}
              value={costOverrunThresholdPct}
              onChange={(e) => {
                const value = parseInt(e.target.value, 10);
                if (isNaN(value) || value < 0) return;
                setCostOverrunThresholdPct(value);
              }}
              onBlur={() => {
                startTransition(async () => {
                  await updateDashboardSettings(
                    projectId,
                    deadlineAlertDays,
                    costOverrunThresholdPct
                  );
                });
              }}
              className="w-20 text-right"
              disabled={saving}
            />
          </div>
        </div>

        {/* スケジュール計算設定 */}
        <div className="space-y-4 pt-4 border-t">
          <div>
            <Label className="text-base font-medium">スケジュール計算設定</Label>
            <div className="text-sm text-gray-500 mt-1">
              スケジュールタブの前詰め計算における定常タスクの扱いを設定します。
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="steadyKeywords" className="text-sm font-medium">
              定常タスク判定キーワード
            </Label>
            <div className="text-xs text-gray-500">
              タスク名にこれらの語を含むタスクは「定常タスク」として前詰めせず、予定期間のまま扱います（改行・カンマ区切り）。
            </div>
            <textarea
              id="steadyKeywords"
              value={steadyKeywordsText}
              onChange={(e) => setSteadyKeywordsText(e.target.value)}
              onBlur={onSteadyKeywordsBlur}
              rows={3}
              placeholder={"例: プロジェクト管理\n進捗管理"}
              className="w-full border rounded px-2 py-1 text-sm"
              disabled={saving}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="consumeSteady" className="text-sm font-medium">
                定常タスクが稼働を消費する
              </Label>
              <div className="text-xs text-gray-500 mt-0.5">
                オン: 定常タスクの工数が日々の稼働を消費し、通常タスクの前詰めが後ろ倒しになります
              </div>
            </div>
            <Switch
              id="consumeSteady"
              checked={consumeSteadyTaskCapacity}
              onCheckedChange={onConsumeSteadyToggle}
              disabled={saving}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">定常タスクの日次消費量</Label>
            <RadioGroup
              value={steadyDailyHoursMode}
              onValueChange={(v) =>
                onSteadyModeChange(v as SteadyDailyHoursMode)
              }
              name="steadyDailyHoursMode"
            >
              <div className="flex items-start space-x-3">
                <RadioGroupItem
                  value="PRORATE"
                  id="steady-prorate"
                  disabled={saving}
                />
                <Label htmlFor="steady-prorate" className="cursor-pointer">
                  <div className="flex flex-col">
                    <span className="font-medium">予定工数を期間で按分</span>
                    <span className="text-xs text-gray-500 font-normal">
                      予定工数 ÷ 期間内の稼働日数
                    </span>
                  </div>
                </Label>
              </div>
              <div className="flex items-start space-x-3">
                <RadioGroupItem
                  value="FIXED"
                  id="steady-fixed"
                  disabled={saving}
                />
                <Label htmlFor="steady-fixed" className="cursor-pointer">
                  <div className="flex flex-col">
                    <span className="font-medium">
                      日次固定値（キーワード別・今後対応）
                    </span>
                    <span className="text-xs text-gray-500 font-normal">
                      固定値が未設定の場合は按分にフォールバックします
                    </span>
                  </div>
                </Label>
              </div>
            </RadioGroup>

            {steadyDailyHoursMode === "FIXED" && (
              <div className="space-y-2 pl-6 pt-2">
                <Label className="text-sm font-medium">
                  キーワード別の日次固定時間 (h/日)
                </Label>
                {parseKeywords(steadyKeywordsText).length === 0 ? (
                  <div className="text-xs text-gray-500">
                    先に定常タスク判定キーワードを入力してください。
                  </div>
                ) : (
                  parseKeywords(steadyKeywordsText).map((kw) => (
                    <div
                      key={kw}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="text-sm">{kw}</span>
                      <Input
                        type="number"
                        min={0}
                        step={0.5}
                        value={steadyFixedHours[kw] ?? ""}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value);
                          onSteadyFixedHourChange(kw, Number.isFinite(v) ? v : 0);
                        }}
                        onBlur={onSteadyFixedHoursBlur}
                        placeholder="按分"
                        className="w-24 text-right"
                        disabled={saving}
                      />
                    </div>
                  ))
                )}
                <div className="text-xs text-gray-500">
                  空欄のキーワードは按分にフォールバックします。
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
