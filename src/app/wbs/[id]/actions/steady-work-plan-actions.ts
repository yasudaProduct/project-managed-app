"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { container } from "@/lib/inversify.config";
import { SYMBOL } from "@/types/symbol";
import type { IStandingWorkApplicationService } from "@/applications/standing-work/standing-work-application-service";
import { STEADY_PLAN_UNITS, type SteadyPlanUnit, type SteadyWorkTaskDto } from "@/types/steady-work-plan";
import type { ActionResult } from "@/types/action-result";

function getStandingWorkService(): IStandingWorkApplicationService {
  return container.get<IStandingWorkApplicationService>(SYMBOL.IStandingWorkApplicationService);
}

const INVALID_INPUT = "入力値が不正です。";

/** 日付のみ（YYYY-MM-DD）。UTC 深夜の Date に変換して扱う */
const ymdSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const toUtcMidnight = (ymd: string) => new Date(`${ymd}T00:00:00.000Z`);

const planFieldsSchema = {
  wbsId: z.number().int().positive(),
  unit: z.enum(STEADY_PLAN_UNITS),
  hours: z.number().min(0).finite(),
  validFrom: ymdSchema,
  validTo: ymdSchema.nullable().optional(),
};

const createSteadyWorkTaskSchema = z.object({
  wbsId: z.number().int().positive(),
  name: z.string().trim().min(1),
  assigneeId: z.number().int().positive().optional(),
});

const createSteadyWorkPlanSchema = z.object({
  ...planFieldsSchema,
  taskId: z.number().int().positive(),
});

const updateSteadyWorkPlanSchema = z.object({
  ...planFieldsSchema,
  id: z.number().int().positive(),
});

const deleteSteadyWorkPlanSchema = z.object({
  wbsId: z.number().int().positive(),
  id: z.number().int().positive(),
});

export type SteadyWorkPlanActionInput = {
  wbsId: number;
  unit: SteadyPlanUnit;
  hours: number;
  /** YYYY-MM-DD */
  validFrom: string;
  /** YYYY-MM-DD。無期限は null / 省略 */
  validTo?: string | null;
};

/** 常設 WBS の定常タスク一覧（担当者・定常枠付き） */
export async function listSteadyWorkTasks(wbsId: number): Promise<SteadyWorkTaskDto[]> {
  return getStandingWorkService().listSteadyWorkTasks(wbsId);
}

export async function createSteadyWorkTask(input: {
  wbsId: number;
  name: string;
  assigneeId?: number;
}): Promise<ActionResult<{ id: number }>> {
  const parsed = createSteadyWorkTaskSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: INVALID_INPUT };
  }

  const result = await getStandingWorkService().createSteadyWorkTask(parsed.data);
  if (!result.success || result.id === undefined) {
    return { success: false, error: result.error ?? "定常タスクの作成に失敗しました。" };
  }

  revalidatePath(`/wbs/${parsed.data.wbsId}`);
  return { success: true, data: { id: result.id } };
}

export async function createSteadyWorkPlan(
  input: SteadyWorkPlanActionInput & { taskId: number }
): Promise<ActionResult<{ id: number }>> {
  const parsed = createSteadyWorkPlanSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: INVALID_INPUT };
  }

  const result = await getStandingWorkService().createSteadyWorkPlan({
    taskId: parsed.data.taskId,
    unit: parsed.data.unit,
    hours: parsed.data.hours,
    validFrom: toUtcMidnight(parsed.data.validFrom),
    validTo: parsed.data.validTo ? toUtcMidnight(parsed.data.validTo) : undefined,
  });
  if (!result.success || result.id === undefined) {
    return { success: false, error: result.error ?? "定常枠の作成に失敗しました。" };
  }

  revalidatePath(`/wbs/${parsed.data.wbsId}`);
  return { success: true, data: { id: result.id } };
}

export async function updateSteadyWorkPlan(
  input: SteadyWorkPlanActionInput & { id: number }
): Promise<ActionResult<void>> {
  const parsed = updateSteadyWorkPlanSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: INVALID_INPUT };
  }

  const result = await getStandingWorkService().updateSteadyWorkPlan({
    id: parsed.data.id,
    unit: parsed.data.unit,
    hours: parsed.data.hours,
    validFrom: toUtcMidnight(parsed.data.validFrom),
    validTo: parsed.data.validTo ? toUtcMidnight(parsed.data.validTo) : undefined,
  });
  if (!result.success) {
    return { success: false, error: result.error ?? "定常枠の更新に失敗しました。" };
  }

  revalidatePath(`/wbs/${parsed.data.wbsId}`);
  return { success: true, data: undefined };
}

export async function deleteSteadyWorkPlan(input: { wbsId: number; id: number }): Promise<ActionResult<void>> {
  const parsed = deleteSteadyWorkPlanSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: INVALID_INPUT };
  }

  const result = await getStandingWorkService().deleteSteadyWorkPlan(parsed.data.id);
  if (!result.success) {
    return { success: false, error: result.error ?? "定常枠の削除に失敗しました。" };
  }

  revalidatePath(`/wbs/${parsed.data.wbsId}`);
  return { success: true, data: undefined };
}
