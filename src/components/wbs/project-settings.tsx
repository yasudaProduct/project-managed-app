"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useEffect, useState, useTransition } from "react";
import {
  getProjectSettings,
  updateProjectSettings,
} from "@/app/wbs/[id]/project-settings-actions";

interface ProjectSettingsProps {
  projectId: string;
}

export function ProjectSettings({ projectId }: ProjectSettingsProps) {
  const [roundToQuarter, setRoundToQuarter] = useState<boolean>(false);
  const [saving, startTransition] = useTransition();

  useEffect(() => {
    (async () => {
      try {
        const data = await getProjectSettings(projectId);
        setRoundToQuarter(Boolean(data?.roundToQuarter));
      } catch { }
    })();
  }, [projectId]);

  const onToggle = (value: boolean) => {
    setRoundToQuarter(value);
    startTransition(async () => {
      await updateProjectSettings(projectId, value);
    });
  };

  return (
    <Card className="rounded-none shadow-none">
      <CardHeader>
        <CardTitle className="text-lg">プロジェクト設定</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
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
            onCheckedChange={onToggle}
            disabled={saving}
          />
        </div>
      </CardContent>
    </Card>
  );
}
