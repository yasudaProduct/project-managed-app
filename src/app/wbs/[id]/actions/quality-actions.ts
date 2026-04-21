"use server";

import { container } from "@/lib/inversify.config";
import { SYMBOL } from "@/types/symbol";
import { revalidatePath } from "next/cache";
import type {
  IQualityApplicationService,
  RegisterFindingInput,
  RegisterSizeMetricInput,
  UpdateFindingInput,
  QualityTargetListItem,
  WbsQualitySummary,
  QualityTrendPoint,
  FindingsByReviewee,
  FindingsByCategory,
} from "@/applications/quality/quality-application.service";
import { SyncQualityTargetsService, SyncResult } from "@/applications/quality/sync-quality-targets.service";
import { QualitySizeUnit, QualitySeverity } from "@/domains/quality/value-objects/quality-enums";
import {
  FindingCsvRow,
  SizeCsvRow,
  parseFindingRows,
  parseSizeRows,
} from "@/applications/quality/quality-io.service";
import type { IQualityReviewTargetRepository } from "@/applications/quality/i-quality-review-target.repository";

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
  sizeUnit: QualitySizeUnit | "MAN_HOUR" = "MAN_HOUR",
  isActive?: boolean,
): Promise<QualityTargetListItem[]> {
  return toQualityAppService().listTargetsByWbs(wbsId, sizeUnit, isActive);
}

export async function getWbsQualitySummary(
  wbsId: number,
  sizeUnit: QualitySizeUnit | "MAN_HOUR",
): Promise<WbsQualitySummary> {
  return toQualityAppService().getWbsSummary(wbsId, sizeUnit);
}

export async function getQualityTrend(
  wbsId: number,
  sizeUnit: QualitySizeUnit | "MAN_HOUR",
  fromDate?: string,
  toDate?: string,
  phase?: string,
): Promise<QualityTrendPoint[]> {
  return toQualityAppService().getTrend({
    wbsId,
    sizeUnit,
    fromDate: fromDate ? new Date(fromDate) : undefined,
    toDate: toDate ? new Date(toDate) : undefined,
    phase: phase || undefined,
  });
}

export async function getWbsAllFindings(wbsId: number) {
  const findings = await toQualityAppService().listWbsFindings(wbsId);
  return findings.map((f) => ({
    ...f,
    foundAt: f.foundAt.toISOString(),
  }));
}

export async function getQualityFindingsByReviewee(
  wbsId: number,
): Promise<FindingsByReviewee[]> {
  return toQualityAppService().getFindingsByReviewee(wbsId);
}

export async function getQualityFindingsByCategory(
  wbsId: number,
): Promise<FindingsByCategory[]> {
  return toQualityAppService().getFindingsByCategory(wbsId);
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

async function resolveTargetIdByTaskNo(
  wbsId: number,
  taskNo: string,
): Promise<number | null> {
  const repo = container.get<IQualityReviewTargetRepository>(
    SYMBOL.IQualityReviewTargetRepository,
  );
  const target = await repo.findByWbsAndTaskNo(wbsId, taskNo);
  return target?.id ?? null;
}

export interface ImportQualityCsvResult {
  success: boolean;
  created: number;
  errors: { line: number; message: string }[];
}

export async function importQualityFindingsCsv(
  wbsId: number,
  rows: FindingCsvRow[],
  mode: "merge" | "replace",
): Promise<ImportQualityCsvResult> {
  const parsed = parseFindingRows(rows);
  const errors = [...parsed.errors];
  const app = toQualityAppService();

  const grouped = new Map<number, typeof parsed.rows>();
  for (let i = 0; i < parsed.rows.length; i++) {
    const row = parsed.rows[i];
    const targetId = await resolveTargetIdByTaskNo(wbsId, row.taskNo);
    if (targetId === null) {
      errors.push({ line: i + 2, message: `評価対象が見つかりません: ${row.taskNo}` });
      continue;
    }
    const arr = grouped.get(targetId) ?? [];
    arr.push(row);
    grouped.set(targetId, arr);
  }

  let created = 0;
  for (const [targetId, items] of grouped.entries()) {
    const res = await app.importFindings(
      targetId,
      items.map((x) => ({
        severity: x.severity,
        category: x.category,
        description: x.description,
        foundAt: x.foundAt,
      })),
      mode,
    );
    created += res.created;
  }

  revalidatePath(`/wbs/${wbsId}/quality`);
  return { success: errors.length === 0, created, errors };
}

export async function importQualitySizeMetricsCsv(
  wbsId: number,
  rows: SizeCsvRow[],
  mode: "merge" | "replace",
): Promise<ImportQualityCsvResult> {
  const parsed = parseSizeRows(rows);
  const errors = [...parsed.errors];
  const app = toQualityAppService();

  const items: RegisterSizeMetricInput[] = [];
  for (let i = 0; i < parsed.rows.length; i++) {
    const row = parsed.rows[i];
    const targetId = await resolveTargetIdByTaskNo(wbsId, row.taskNo);
    if (targetId === null) {
      errors.push({ line: i + 2, message: `評価対象が見つかりません: ${row.taskNo}` });
      continue;
    }
    items.push({
      targetId,
      unit: row.unit,
      value: row.value,
      measuredAt: row.measuredAt,
      note: row.note,
    });
  }

  const res = await app.importSizeMetrics(items, mode);
  revalidatePath(`/wbs/${wbsId}/quality`);
  return { success: errors.length === 0, created: res.created, errors };
}
