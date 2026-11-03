"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { toast } from "@/hooks/use-toast";
import { updateWbsImportSchedule } from "@/app/wbs/[id]/import-schedule-actions";
import { IMPORT_SCHEDULE_PRESETS, type WbsImportScheduleDto } from "@/types/import-schedule";
import { getImportScheduleLabel, WBS_SYNC_MODE_LABELS } from "@/utils/import-schedule-labels";
import { formatDate } from "@/utils/date-util";

const formSchema = z.object({
  isEnabled: z.boolean(),
  cronExpression: z.string().min(1),
  syncMode: z.enum(["diff", "replace"]),
  includeActuals: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

const SYNC_MODE_DESCRIPTIONS: Record<FormValues["syncMode"], string> = {
  diff: "タスクNoで照合して追加・更新・削除します。既存タスクと実績の紐付けは保たれます。",
  replace: "WBSのタスクをすべて削除して作り直します。",
};

type Props = {
  wbsId: number;
  schedule: WbsImportScheduleDto;
};

function formatRunAt(iso: string | null): string {
  return iso ? formatDate(new Date(iso), "YYYY/MM/DD HH:mm:ss") : "—";
}

/** WBSごとの定期インポート設定（WBS同期と、その後の実績取込） */
export function WbsImportScheduleSettings({ wbsId, schedule }: Props) {
  const router = useRouter();
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      isEnabled: schedule.isEnabled,
      cronExpression: schedule.cronExpression,
      syncMode: schedule.syncMode,
      includeActuals: schedule.includeActuals,
    },
  });

  // 画面の選択肢にない実行タイミング（API 等で設定されたもの）も選択肢として残す
  const timingOptions = IMPORT_SCHEDULE_PRESETS.some((p) => p.cronExpression === schedule.cronExpression)
    ? IMPORT_SCHEDULE_PRESETS
    : [
        ...IMPORT_SCHEDULE_PRESETS,
        { label: getImportScheduleLabel(schedule.cronExpression), cronExpression: schedule.cronExpression },
      ];

  const syncMode = form.watch("syncMode");
  const includeActuals = form.watch("includeActuals");

  const onSubmit = async (values: FormValues) => {
    const result = await updateWbsImportSchedule({ wbsId, ...values });
    if (!result.success) {
      toast({ variant: "destructive", title: "保存に失敗しました", description: result.error });
      return;
    }
    toast({ title: "保存しました", description: "定期インポートの設定を保存しました。" });
    router.refresh();
  };

  return (
    <Card className="rounded-none shadow-none">
      <CardHeader>
        <CardTitle className="text-lg">定期インポート</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="isEnabled"
              render={({ field }) => (
                <FormItem className="flex items-start gap-3 space-y-0">
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div className="space-y-1">
                    <FormLabel className="text-base font-medium">定期インポートを行う</FormLabel>
                    <FormDescription>
                      指定したタイミングで、このWBSを外部のWBSデータと同期します。全体の一時停止は
                      <Link href="/settings/system" className="underline mx-1">
                        システム設定
                      </Link>
                      で行えます。
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cronExpression"
              render={({ field }) => (
                <FormItem>
                  <Label className="text-base font-medium">頻度</Label>
                  <RadioGroup value={field.value} onValueChange={field.onChange} name="cronExpression">
                    {timingOptions.map((option, index) => (
                      <div key={option.cronExpression} className="flex items-center space-x-3">
                        <RadioGroupItem value={option.cronExpression} id={`import-schedule-timing-${index}`} />
                        <Label htmlFor={`import-schedule-timing-${index}`} className="cursor-pointer font-normal">
                          {option.label}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="syncMode"
              render={({ field }) => (
                <FormItem>
                  <Label className="text-base font-medium">WBS同期モード</Label>
                  <RadioGroup value={field.value} onValueChange={field.onChange} name="syncMode">
                    {(["diff", "replace"] as const).map((mode) => (
                      <div key={mode} className="flex items-start space-x-3">
                        <RadioGroupItem value={mode} id={`import-schedule-sync-${mode}`} />
                        <Label htmlFor={`import-schedule-sync-${mode}`} className="cursor-pointer">
                          <div className="flex flex-col">
                            <span className="font-medium">{WBS_SYNC_MODE_LABELS[mode]}</span>
                            <span className="text-xs text-gray-500 font-normal">{SYNC_MODE_DESCRIPTIONS[mode]}</span>
                          </div>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="includeActuals"
              render={({ field }) => (
                <FormItem className="flex items-start gap-3 space-y-0">
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div className="space-y-1">
                    <FormLabel className="text-base font-medium">実績（Geppo）も取り込む</FormLabel>
                    <FormDescription>
                      WBS同期の後に、このWBSの実績を前月分・当月分取り込みます。
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            {syncMode === "replace" && !includeActuals && (
              <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>
                  洗い替えではタスクが作り直されるため、実績とタスクの紐付けが外れます。「実績（Geppo）も取り込む」を有効にすると、同期の直後に実績を取り込み直します。
                </span>
              </div>
            )}

            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              <dt className="text-gray-500">次回実行予定</dt>
              <dd data-testid="import-schedule-next-run">
                {formatRunAt(schedule.isEnabled ? schedule.nextRunAt : null)}
              </dd>
              <dt className="text-gray-500">前回実行</dt>
              <dd data-testid="import-schedule-last-run">{formatRunAt(schedule.lastRunAt)}</dd>
            </dl>

            <Button type="submit" disabled={form.formState.isSubmitting}>
              保存
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
