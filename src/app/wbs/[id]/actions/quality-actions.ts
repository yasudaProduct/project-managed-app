"use server";

import { container } from "@/lib/inversify.config";
import { SYMBOL } from "@/types/symbol";
import { revalidatePath } from "next/cache";
import type {
  IQualityApplicationService,
  RegisterFindingInput,
  RegisterSizeMetricInput,
  UpdateFindingInput,
  QualityMetricsSummary,
  QualityTargetListItem,
} from "@/applications/quality/quality-application.service";
import { SyncQualityTargetsService, SyncResult } from "@/applications/quality/sync-quality-targets.service";
import { QualitySizeUnit, QualitySeverity } from "@/domains/quality/value-objects/quality-enums";
import type { QualityThresholds } from "@/domains/quality/value-objects/quality-threshold";

export interface QualityActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

function toQualityAppService(): IQualityApplicationService {
  return container.get<IQualityApplicationService>(SYMBOL.IQualityApplicationService);
}

export async function getQualityTargets(
  wbsId: number,
  isActive?: boolean,
): Promise<QualityTargetListItem[]> {
  return toQualityAppService().listTargetsByWbs(wbsId, isActive);
}

export async function getQualitySummary(
  targetId: number,
  sizeUnit: QualitySizeUnit | "MAN_HOUR",
  thresholds?: QualityThresholds,
): Promise<QualityMetricsSummary> {
  return toQualityAppService().getSummary(targetId, sizeUnit, thresholds);
}

export async function getQualityFindings(targetId: number) {
  const findings = await toQualityAppService().listFindings(targetId);
  return findings.map((f) => ({
    id: f.id!,
    targetId: f.targetId,
    severity: f.severity,
    category: f.category ?? null,
    description: f.description ?? null,
    foundAt: f.foundAt.toISOString(),
  }));
}

export async function getQualitySizeMetrics(targetId: number) {
  const metrics = await toQualityAppService().listSizeMetrics(targetId);
  return metrics.map((m) => ({
    id: m.id!,
    targetId: m.targetId,
    unit: m.unit,
    value: m.value,
    measuredAt: m.measuredAt.toISOString(),
    note: m.note ?? null,
  }));
}

export async function registerQualityFinding(
  wbsId: number,
  input: {
    targetId: number;
    severity: QualitySeverity;
    category?: string;
    description?: string;
    foundAt: string;
  },
): Promise<QualityActionResult<{ id: number }>> {
  try {
    const finding = await toQualityAppService().registerFinding({
      targetId: input.targetId,
      severity: input.severity,
      category: input.category,
      description: input.description,
      foundAt: new Date(input.foundAt),
    } satisfies RegisterFindingInput);
    revalidatePath(`/wbs/${wbsId}/quality`);
    return { success: true, data: { id: finding.id! } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "指摘の登録に失敗しました" };
  }
}

export async function updateQualityFinding(
  wbsId: number,
  input: {
    id: number;
    targetId: number;
    severity: QualitySeverity;
    category?: string;
    description?: string;
    foundAt: string;
  },
): Promise<QualityActionResult> {
  try {
    await toQualityAppService().updateFinding({
      id: input.id,
      targetId: input.targetId,
      severity: input.severity,
      category: input.category,
      description: input.description,
      foundAt: new Date(input.foundAt),
    } satisfies UpdateFindingInput);
    revalidatePath(`/wbs/${wbsId}/quality`);
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "指摘の更新に失敗しました" };
  }
}

export async function deleteQualityFinding(
  wbsId: number,
  id: number,
): Promise<QualityActionResult> {
  try {
    await toQualityAppService().deleteFinding(id);
    revalidatePath(`/wbs/${wbsId}/quality`);
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "指摘の削除に失敗しました" };
  }
}

export async function registerQualitySizeMetric(
  wbsId: number,
  input: {
    targetId: number;
    unit: QualitySizeUnit;
    value: number;
    measuredAt: string;
    note?: string;
  },
): Promise<QualityActionResult> {
  try {
    await toQualityAppService().registerSizeMetric({
      targetId: input.targetId,
      unit: input.unit,
      value: input.value,
      measuredAt: new Date(input.measuredAt),
      note: input.note,
    } satisfies RegisterSizeMetricInput);
    revalidatePath(`/wbs/${wbsId}/quality`);
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "規模の登録に失敗しました" };
  }
}

export async function deleteQualitySizeMetric(
  wbsId: number,
  targetId: number,
  unit: QualitySizeUnit,
): Promise<QualityActionResult> {
  try {
    await toQualityAppService().deleteSizeMetric(targetId, unit);
    revalidatePath(`/wbs/${wbsId}/quality`);
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "規模の削除に失敗しました" };
  }
}

export async function syncQualityTargets(
  wbsId: number,
): Promise<QualityActionResult<SyncResult>> {
  try {
    const service = container.get<SyncQualityTargetsService>(SYMBOL.SyncQualityTargetsService);
    const result = await service.syncForWbs(wbsId);
    revalidatePath(`/wbs/${wbsId}/quality`);
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "評価対象の同期に失敗しました" };
  }
}
