"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

interface ProjectSettingsProps {
  projectId: string;
}

export function ProjectSettings({ projectId }: ProjectSettingsProps) {
  const [roundToQuarter, setRoundToQuarter] = useState<boolean>(false);
  const [progressMeasurementMethod, setProgressMeasurementMethod] =
    useState<ProgressMeasurementMethod>("SELF_REPORTED");
  const [saving, startTransition] = useTransition();

  useEffect(() => {
    (async () => {
      try {
        const data = await getProjectSettings(projectId);
        setRoundToQuarter(Boolean(data?.roundToQuarter));
        setProgressMeasurementMethod(
          data?.progressMeasurementMethod || "SELF_REPORTED"
        );
      } catch { }
    })();
  }, [projectId]);

  const onToggle = (value: boolean) => {
    setRoundToQuarter(value);
    startTransition(async () => {
      await updateProjectSettings(projectId, value, progressMeasurementMethod);
    });
  };

  const onProgressMethodChange = (value: ProgressMeasurementMethod) => {
    setProgressMeasurementMethod(value);
    startTransition(async () => {
      await updateProjectSettings(projectId, roundToQuarter, value);
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
            <Label htmlFor="progressMeasurementMethod" className="text-base font-medium">
              進捗測定方式
            </Label>
            <div className="text-sm text-gray-500 mt-1">
              タスクの進捗率をどのように測定するかを選択します。見通し工数算出やEVMで使用されます。
            </div>
          </div>
          <Select
            value={progressMeasurementMethod}
            onValueChange={onProgressMethodChange}
            disabled={saving}
          >
            <SelectTrigger id="progressMeasurementMethod" className="w-full">
              <SelectValue placeholder="進捗測定方式を選択" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ZERO_HUNDRED">
                <div className="flex flex-col items-start">
                  <span className="font-medium">
                    {PROGRESS_MEASUREMENT_METHOD_LABELS.ZERO_HUNDRED}
                  </span>
                  <span className="text-xs text-gray-500">
                    {PROGRESS_MEASUREMENT_METHOD_DESCRIPTIONS.ZERO_HUNDRED}
                  </span>
                </div>
              </SelectItem>
              <SelectItem value="FIFTY_FIFTY">
                <div className="flex flex-col items-start">
                  <span className="font-medium">
                    {PROGRESS_MEASUREMENT_METHOD_LABELS.FIFTY_FIFTY}
                  </span>
                  <span className="text-xs text-gray-500">
                    {PROGRESS_MEASUREMENT_METHOD_DESCRIPTIONS.FIFTY_FIFTY}
                  </span>
                </div>
              </SelectItem>
              <SelectItem value="SELF_REPORTED">
                <div className="flex flex-col items-start">
                  <span className="font-medium">
                    {PROGRESS_MEASUREMENT_METHOD_LABELS.SELF_REPORTED}
                  </span>
                  <span className="text-xs text-gray-500">
                    {PROGRESS_MEASUREMENT_METHOD_DESCRIPTIONS.SELF_REPORTED}
                  </span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
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
