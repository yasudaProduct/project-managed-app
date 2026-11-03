"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  STEADY_PLAN_UNITS,
  STEADY_PLAN_UNIT_LABELS,
  type SteadyWorkPlanDto,
} from "@/types/steady-work-plan";
import { createSteadyWorkPlan, updateSteadyWorkPlan } from "@/app/wbs/[id]/actions/steady-work-plan-actions";
import { toast } from "@/hooks/use-toast";
import { formatDate } from "@/utils/date-util";

const DATE_PATTERN = /^\d{4}\/\d{2}\/\d{2}$/;

const formSchema = z
  .object({
    unit: z.enum(STEADY_PLAN_UNITS),
    hours: z.coerce.number({ invalid_type_error: "時間を入力してください" }).min(0, "時間は0以上で入力してください"),
    validFrom: z.string().regex(DATE_PATTERN, "開始日は YYYY/MM/DD 形式で入力してください"),
    /** 空文字は無期限 */
    validTo: z.string().refine((value) => value === "" || DATE_PATTERN.test(value), {
      message: "終了日は YYYY/MM/DD 形式で入力してください",
    }),
  })
  .superRefine((values, ctx) => {
    if (values.validTo && values.validTo < values.validFrom) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["validTo"], message: "終了日は開始日以降にしてください" });
    }
  });

type SteadyWorkPlanFormValues = z.infer<typeof formSchema>;

const EMPTY_FORM: SteadyWorkPlanFormValues = {
  unit: "PER_DAY",
  hours: 1,
  validFrom: "",
  validTo: "",
};

const UNIT_DESCRIPTIONS: Record<(typeof STEADY_PLAN_UNITS)[number], string> = {
  PER_DAY: "稼働日ごとに固定の時間を使う（半休などで稼働が減っても減らさない）",
  PER_MONTH: "月の時間を、その月の稼働可能時間の比で日別に按分する",
};

/** YYYY/MM/DD → YYYY-MM-DD */
const toYmd = (value: string) => value.replace(/\//g, "-");

interface SteadyWorkPlanDialogProps {
  wbsId: number;
  /** 枠を付けるタスク（新規作成時） */
  task: { taskId: number; name: string } | null;
  /** 編集対象（null なら新規作成） */
  plan: SteadyWorkPlanDto | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function SteadyWorkPlanDialog({ wbsId, task, plan, isOpen, onClose, onSaved }: SteadyWorkPlanDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = plan !== null;

  const form = useForm<SteadyWorkPlanFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: EMPTY_FORM,
  });

  useEffect(() => {
    if (!isOpen) return;
    if (plan) {
      form.reset({
        unit: plan.unit,
        hours: plan.hours,
        validFrom: formatDate(new Date(plan.validFrom), "YYYY/MM/DD"),
        validTo: plan.validTo ? formatDate(new Date(plan.validTo), "YYYY/MM/DD") : "",
      });
    } else {
      form.reset(EMPTY_FORM);
    }
  }, [isOpen, plan, form]);

  const onSubmit = async (values: SteadyWorkPlanFormValues) => {
    setIsSubmitting(true);
    try {
      const payload = {
        wbsId,
        unit: values.unit,
        hours: values.hours,
        validFrom: toYmd(values.validFrom),
        validTo: values.validTo ? toYmd(values.validTo) : null,
      };
      const result = plan
        ? await updateSteadyWorkPlan({ ...payload, id: plan.id })
        : task
          ? await createSteadyWorkPlan({ ...payload, taskId: task.taskId })
          : { success: false as const, error: "タスクが選択されていません" };

      if (result.success) {
        toast({ title: isEditing ? "定常枠を更新しました" : "定常枠を追加しました" });
        onClose();
        onSaved();
      } else {
        toast({ title: "エラー", description: result.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "エラー", description: "予期しないエラーが発生しました", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "定常枠を編集" : `定常枠を追加${task ? `: ${task.name}` : ""}`}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="unit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>単位</FormLabel>
                  <FormControl>
                    <RadioGroup value={field.value} onValueChange={field.onChange}>
                      {STEADY_PLAN_UNITS.map((unit) => (
                        <div key={unit} className="flex items-start space-x-3">
                          <RadioGroupItem value={unit} id={`steady-plan-unit-${unit}`} className="mt-0.5" />
                          <div className="flex flex-col">
                            <Label htmlFor={`steady-plan-unit-${unit}`} className="cursor-pointer font-medium">
                              {STEADY_PLAN_UNIT_LABELS[unit]}
                            </Label>
                            <span className="text-xs text-gray-500">{UNIT_DESCRIPTIONS[unit]}</span>
                          </div>
                        </div>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="hours"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>時間</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.25" min="0" {...field} />
                  </FormControl>
                  <FormDescription>単位あたりの時間（h）</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="validFrom"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>開始日</FormLabel>
                  <FormControl>
                    <Input placeholder="YYYY/MM/DD" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="validTo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>終了日</FormLabel>
                  <FormControl>
                    <Input placeholder="YYYY/MM/DD（空欄は無期限）" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                キャンセル
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "保存中..." : "保存"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
