"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
} from "@/app/actions/project-settings-actions";
import { ScheduleMatchType } from "@/types/project-settings";

interface ProjectSettingsProps {
  projectId: string;
}

export function ProjectSettings({ projectId }: ProjectSettingsProps) {
  const [roundToQuarter, setRoundToQuarter] = useState<boolean>(false);
  const [standardWorkingHours, setStandardWorkingHours] = useState<number>(7.5);
  const [considerPersonalSchedule, setConsiderPersonalSchedule] =
    useState<boolean>(true);
  const [scheduleIncludePatterns, setScheduleIncludePatterns] = useState<
    string[]
  >(["休暇", "有給", "休み", "全休", "代休", "振休", "有給休暇"]);
  const [scheduleExcludePatterns, setScheduleExcludePatterns] = useState<
    string[]
  >([]);
  const [scheduleMatchType, setScheduleMatchType] =
    useState<ScheduleMatchType>("CONTAINS");
  const [saving, startTransition] = useTransition();

  useEffect(() => {
    (async () => {
      try {
        const data = await getProjectSettings(projectId);
        setRoundToQuarter(Boolean(data?.roundToQuarter));
        setStandardWorkingHours(
          data?.standardWorkingHours ? Number(data.standardWorkingHours) : 7.5
        );
        setConsiderPersonalSchedule(Boolean(data?.considerPersonalSchedule));
        setScheduleIncludePatterns(
          data?.scheduleIncludePatterns || [
            "休暇",
            "有給",
            "休み",
            "全休",
            "代休",
            "振休",
            "有給休暇",
          ]
        );
        setScheduleExcludePatterns(data?.scheduleExcludePatterns || []);
        setScheduleMatchType(data?.scheduleMatchType || "CONTAINS");
      } catch {}
    })();
  }, [projectId]);

  const onToggleRoundToQuarter = (value: boolean) => {
    setRoundToQuarter(value);
    startTransition(async () => {
      await updateProjectSettings(projectId, { roundToQuarter: value });
    });
  };

  const onUpdateStandardWorkingHours = (value: string) => {
    const hours = parseFloat(value);
    if (!isNaN(hours) && hours > 0) {
      setStandardWorkingHours(hours);
      startTransition(async () => {
        await updateProjectSettings(projectId, { standardWorkingHours: hours });
      });
    }
  };

  const onToggleConsiderPersonalSchedule = (value: boolean) => {
    setConsiderPersonalSchedule(value);
    startTransition(async () => {
      await updateProjectSettings(projectId, {
        considerPersonalSchedule: value,
      });
    });
  };

  const onUpdateScheduleIncludePatterns = (value: string) => {
    const patterns = value
      .split("\n")
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
    setScheduleIncludePatterns(patterns);
    startTransition(async () => {
      await updateProjectSettings(projectId, {
        scheduleIncludePatterns: patterns,
      });
    });
  };

  const onUpdateScheduleExcludePatterns = (value: string) => {
    const patterns = value
      .split("\n")
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
    setScheduleExcludePatterns(patterns);
    startTransition(async () => {
      await updateProjectSettings(projectId, {
        scheduleExcludePatterns: patterns,
      });
    });
  };

  const onUpdateScheduleMatchType = (value: ScheduleMatchType) => {
    setScheduleMatchType(value);
    startTransition(async () => {
      await updateProjectSettings(projectId, { scheduleMatchType: value });
    });
  };

  return (
    <Card className="rounded-none shadow-none">
      <CardHeader>
        <CardTitle className="text-lg">プロジェクト設定</CardTitle>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="flex items-center justify-between">
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
            onCheckedChange={onToggleRoundToQuarter}
            disabled={saving}
          />
        </div>

        <div className="border-t pt-6">
          <h3 className="text-lg font-medium mb-4">Assignee Gantt 計算設定</h3>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 items-center">
              <div>
                <Label
                  htmlFor="standardWorkingHours"
                  className="text-base font-medium"
                >
                  標準勤務時間（時間）
                </Label>
                <div className="text-sm text-gray-500 mt-1">
                  1日あたりの標準勤務時間を設定します
                </div>
              </div>
              <Input
                id="standardWorkingHours"
                type="number"
                step="0.5"
                min="0"
                value={standardWorkingHours}
                onChange={(e) => onUpdateStandardWorkingHours(e.target.value)}
                disabled={saving}
                className="max-w-32"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label
                  htmlFor="considerPersonalSchedule"
                  className="text-base font-medium"
                >
                  個人予定を考慮する
                </Label>
                <div className="text-sm text-gray-500 mt-1">
                  個人予定を稼働時間計算に含めるかを設定します
                </div>
              </div>
              <Switch
                id="considerPersonalSchedule"
                checked={considerPersonalSchedule}
                onCheckedChange={onToggleConsiderPersonalSchedule}
                disabled={saving}
              />
            </div>

            {considerPersonalSchedule && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label
                      htmlFor="scheduleIncludePatterns"
                      className="text-base font-medium"
                    >
                      考慮対象パターン（改行区切り）
                    </Label>
                    <div className="text-sm text-gray-500 mt-1 mb-2">
                      これらにマッチする予定を稼働不可時間として計算します
                    </div>
                    <Textarea
                      id="scheduleIncludePatterns"
                      value={scheduleIncludePatterns.join("\n")}
                      onChange={(e) =>
                        onUpdateScheduleIncludePatterns(e.target.value)
                      }
                      disabled={saving}
                      rows={4}
                      placeholder="休暇\n有給\n休み"
                    />
                  </div>

                  <div>
                    <Label
                      htmlFor="scheduleExcludePatterns"
                      className="text-base font-medium"
                    >
                      除外対象パターン（改行区切り）
                    </Label>
                    <div className="text-sm text-gray-500 mt-1 mb-2">
                      これらにマッチする予定は稼働可能時間として計算します
                    </div>
                    <Textarea
                      id="scheduleExcludePatterns"
                      value={scheduleExcludePatterns.join("\n")}
                      onChange={(e) =>
                        onUpdateScheduleExcludePatterns(e.target.value)
                      }
                      disabled={saving}
                      rows={4}
                      placeholder="会議\nMTG\nプロジェクト"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 items-center">
                  <div>
                    <Label
                      htmlFor="scheduleMatchType"
                      className="text-base font-medium"
                    >
                      パターンマッチング方式
                    </Label>
                    <div className="text-sm text-gray-500 mt-1">
                      パターンのマッチング方法を選択します
                    </div>
                  </div>
                  <Select
                    value={scheduleMatchType}
                    onValueChange={onUpdateScheduleMatchType}
                    disabled={saving}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EXACT">完全一致</SelectItem>
                      <SelectItem value="CONTAINS">部分一致</SelectItem>
                      <SelectItem value="REGEX">正規表現</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
