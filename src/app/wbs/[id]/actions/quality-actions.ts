"use server";

import { container } from "@/lib/inversify.config";
import { SYMBOL } from "@/types/symbol";
import { revalidatePath } from "next/cache";
import { QualityTargetService } from "@/applications/quality/quality-target.service";
import { QualityMetricsService, TargetMetricsResult, WbsSummary } from "@/applications/quality/quality-metrics.service";
import { QualityChartService, ScatterResult } from "@/applications/quality/quality-chart.service";
import { SyncQualityTargetsService, SyncResult } from "@/applications/quality/sync-quality-targets.service";
import { QualityFinding } from "@/domains/quality/entities/quality-finding";
import { QualitySizeMetric } from "@/domains/quality/entities/quality-size-metric";
import { QualityTestProgress } from "@/domains/quality/entities/quality-test-progress";
import { QualityThresholdConfig } from "@/domains/quality/entities/quality-threshold-config";
import { QualitySizeUnit, FindingSource } from "@/domains/quality/value-objects/quality-enums";
import { IpaMetricKey } from "@/domains/quality/value-objects/metric-definition";
import { PbCurvePoint } from "@/domains/quality/services/pb-curve-analyzer";
import { ParetoItem, FindingGroupField } from "@/domains/quality/services/pareto-analyzer";
import { AggregationType } from "@/domains/quality/services/scatter-plot-analyzer";
import type { IQualityTargetRepository } from "@/applications/quality/repositories/i-quality-target.repository";
import type { IQualityFindingRepository } from "@/applications/quality/repositories/i-quality-finding.repository";
import type { IQualitySizeMetricRepository } from "@/applications/quality/repositories/i-quality-size-metric.repository";
import type { IQualityTestProgressRepository } from "@/applications/quality/repositories/i-quality-test-progress.repository";
import type { IQualityThresholdConfigRepository } from "@/applications/quality/repositories/i-quality-threshold-config.repository";
import {
  FindingCsvRow,
  SizeCsvRow,
  TestProgressCsvRow,
  TargetAttributeCsvRow,
  parseFindingRows,
  parseSizeRows,
  parseTestProgressRows,
  parseTargetAttributeRows,
} from "@/applications/quality/quality-io.service";

// === Types ===

export interface QualityActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ImportQualityCsvResult {
  success: boolean;
  created: number;
  errors: { line: number; message: string }[];
}

// Serializable types for client
export interface QualityTargetItem {
  id: number;
  wbsId: number;
  taskNo: string;
  name: string;
  subsystem?: string;
  featureGroup?: string;
  phaseCode?: string;
  assigneeId?: string;
  isActive: boolean;
  metrics: Record<IpaMetricKey, number | null>;
  reviewFindingCount: number;
  bugCount: number;
  reviewEffort: number;
  size: number;
  testCaseCount: number;
}

export interface QualityFindingItem {
  id: number;
  targetId: number;
  source: FindingSource;
  injectionPhase?: string;
  phenomenonType?: string;
  causeType?: string;
  category?: string;
  description?: string;
  foundAt: string;
  resolvedAt?: string;
}

export interface QualitySizeMetricItem {
  id: number;
  targetId: number;
  unit: QualitySizeUnit;
  value: number;
  measuredAt: string;
  note?: string;
}

// === Helper ===

function getTargetService() {
  return container.get<QualityTargetService>(SYMBOL.QualityTargetService);
}
function getMetricsService() {
  return container.get<QualityMetricsService>(SYMBOL.QualityMetricsService);
}
function getChartService() {
  return container.get<QualityChartService>(SYMBOL.QualityChartService);
}
function getTargetRepo() {
  return container.get<IQualityTargetRepository>(SYMBOL.IQualityTargetRepository);
}
function getFindingRepo() {
  return container.get<IQualityFindingRepository>(SYMBOL.IQualityFindingRepository);
}
function getSizeMetricRepo() {
  return container.get<IQualitySizeMetricRepository>(SYMBOL.IQualitySizeMetricRepository);
}
function getTestProgressRepo() {
  return container.get<IQualityTestProgressRepository>(SYMBOL.IQualityTestProgressRepository);
}
function getThresholdRepo() {
  return container.get<IQualityThresholdConfigRepository>(SYMBOL.IQualityThresholdConfigRepository);
}

function toTargetItem(r: TargetMetricsResult): QualityTargetItem {
  return {
    id: r.target.id!,
    wbsId: r.target.wbsId,
    taskNo: r.target.taskNo,
    name: r.target.name,
    subsystem: r.target.subsystem,
    featureGroup: r.target.featureGroup,
    phaseCode: r.target.phaseCode,
    assigneeId: r.target.assigneeId,
    isActive: r.target.isActive,
    metrics: r.metrics,
    reviewFindingCount: r.reviewFindingCount,
    bugCount: r.bugCount,
    reviewEffort: r.reviewEffort,
    size: r.size,
    testCaseCount: r.testCaseCount,
  };
}

// === Query Actions ===

export async function getQualityTargets(
  wbsId: number,
  sizeUnit: QualitySizeUnit,
  isActive?: boolean,
): Promise<QualityTargetItem[]> {
  const targets = await getTargetService().listByWbs(wbsId, { isActive });
  const metricsService = getMetricsService();
  const results = await Promise.all(
    targets.map((t) => metricsService.calcTargetMetrics(t, sizeUnit))
  );
  return results.map(toTargetItem);
}

export async function getWbsQualitySummary(
  wbsId: number,
  sizeUnit: QualitySizeUnit,
): Promise<WbsSummary> {
  return getMetricsService().getWbsSummary(wbsId, sizeUnit);
}

export async function getQualityFindings(targetId: number): Promise<QualityFindingItem[]> {
  const findings = await getFindingRepo().findByTarget(targetId);
  return findings.map((f) => ({
    id: f.id!,
    targetId: f.targetId,
    source: f.source,
    injectionPhase: f.injectionPhase,
    phenomenonType: f.phenomenonType,
    causeType: f.causeType,
    category: f.category,
    description: f.description,
    foundAt: f.foundAt.toISOString(),
    resolvedAt: f.resolvedAt?.toISOString(),
  }));
}

export async function getWbsAllFindings(wbsId: number): Promise<QualityFindingItem[]> {
  const targets = await getTargetService().listByWbs(wbsId, { isActive: true });
  const findings = await getFindingRepo().findByTargetIds(targets.map((t) => t.id!));
  return findings.map((f) => ({
    id: f.id!,
    targetId: f.targetId,
    source: f.source,
    injectionPhase: f.injectionPhase,
    phenomenonType: f.phenomenonType,
    causeType: f.causeType,
    category: f.category,
    description: f.description,
    foundAt: f.foundAt.toISOString(),
    resolvedAt: f.resolvedAt?.toISOString(),
  }));
}

export async function getQualitySizeMetrics(targetId: number): Promise<QualitySizeMetricItem[]> {
  const metrics = await getSizeMetricRepo().findByTarget(targetId);
  return metrics.map((m) => ({
    id: m.id!,
    targetId: m.targetId,
    unit: m.unit,
    value: m.value,
    measuredAt: m.measuredAt.toISOString(),
    note: m.note,
  }));
}

// === Chart Actions ===

export async function getScatterData(
  wbsId: number,
  sizeUnit: QualitySizeUnit,
  xMetric: IpaMetricKey,
  yMetric: IpaMetricKey,
  aggregation: AggregationType,
): Promise<ScatterResult> {
  return getChartService().getScatterData(wbsId, sizeUnit, xMetric, yMetric, aggregation);
}

export async function getPbCurveData(targetId: number): Promise<PbCurvePoint[]> {
  const data = await getChartService().getPbCurveData(targetId);
  return data.map((p) => ({
    ...p,
    date: new Date(p.date.toISOString()),
  }));
}

export async function getParetoData(
  wbsId: number,
  groupField: FindingGroupField,
): Promise<ParetoItem[]> {
  return getChartService().getParetoData(wbsId, groupField);
}

export async function getThresholdConfigs(wbsId: number) {
  const configs = await getThresholdRepo().findByWbs(wbsId);
  return configs.map((c) => ({
    id: c.id!,
    wbsId: c.wbsId,
    metricKey: c.metricKey,
    phaseCode: c.phaseCode,
    upperLimit: c.upperLimit,
    lowerLimit: c.lowerLimit,
    warnThreshold: c.warnThreshold,
    dangerThreshold: c.dangerThreshold,
    referenceValue: c.referenceValue,
    note: c.note,
  }));
}

// === Mutation Actions ===

export async function registerQualityFinding(
  wbsId: number,
  input: {
    targetId: number;
    source?: FindingSource;
    injectionPhase?: string;
    phenomenonType?: string;
    causeType?: string;
    category?: string;
    description?: string;
    foundAt: string;
  },
): Promise<QualityActionResult<{ id: number }>> {
  try {
    const finding = await getFindingRepo().create(
      QualityFinding.create({
        targetId: input.targetId,
        source: input.source,
        injectionPhase: input.injectionPhase,
        phenomenonType: input.phenomenonType,
        causeType: input.causeType,
        category: input.category,
        description: input.description,
        foundAt: new Date(input.foundAt),
      })
    );
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
    source?: FindingSource;
    injectionPhase?: string;
    phenomenonType?: string;
    causeType?: string;
    category?: string;
    description?: string;
    foundAt: string;
    resolvedAt?: string;
  },
): Promise<QualityActionResult> {
  try {
    await getFindingRepo().update(
      QualityFinding.reconstruct({
        id: input.id,
        targetId: input.targetId,
        source: input.source ?? FindingSource.REVIEW,
        injectionPhase: input.injectionPhase,
        phenomenonType: input.phenomenonType,
        causeType: input.causeType,
        category: input.category,
        description: input.description,
        foundAt: new Date(input.foundAt),
        resolvedAt: input.resolvedAt ? new Date(input.resolvedAt) : undefined,
      })
    );
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
    await getFindingRepo().delete(id);
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
    await getSizeMetricRepo().upsert(
      QualitySizeMetric.create({
        targetId: input.targetId,
        unit: input.unit,
        value: input.value,
        measuredAt: new Date(input.measuredAt),
        note: input.note,
      })
    );
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
    await getSizeMetricRepo().deleteByTargetAndUnit(targetId, unit);
    revalidatePath(`/wbs/${wbsId}/quality`);
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "規模の削除に失敗しました" };
  }
}

export async function upsertThresholdConfig(
  wbsId: number,
  input: {
    metricKey: string;
    phaseCode?: string;
    upperLimit?: number;
    lowerLimit?: number;
    warnThreshold?: number;
    dangerThreshold?: number;
    referenceValue?: number;
    note?: string;
  },
): Promise<QualityActionResult> {
  try {
    await getThresholdRepo().upsert(
      QualityThresholdConfig.create({ wbsId, ...input })
    );
    revalidatePath(`/wbs/${wbsId}/quality`);
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "閾値の保存に失敗しました" };
  }
}

export async function deleteThresholdConfig(
  wbsId: number,
  id: number,
): Promise<QualityActionResult> {
  try {
    await getThresholdRepo().delete(id);
    revalidatePath(`/wbs/${wbsId}/quality`);
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "閾値の削除に失敗しました" };
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

// === Import Actions ===

async function resolveTargetIdByTaskNo(wbsId: number, taskNo: string): Promise<number | null> {
  const repo = getTargetRepo();
  const target = await repo.findByWbsAndTaskNo(wbsId, taskNo);
  return target?.id ?? null;
}

export async function importQualityFindingsCsv(
  wbsId: number,
  rows: FindingCsvRow[],
  mode: "merge" | "replace",
): Promise<ImportQualityCsvResult> {
  const parsed = parseFindingRows(rows);
  const errors = [...parsed.errors];
  const findingRepo = getFindingRepo();

  let created = 0;
  for (let i = 0; i < parsed.rows.length; i++) {
    const row = parsed.rows[i];
    const targetId = await resolveTargetIdByTaskNo(wbsId, row.taskNo);
    if (targetId === null) {
      errors.push({ line: i + 2, message: `評価対象が見つかりません: ${row.taskNo}` });
      continue;
    }

    if (mode === "replace" && i === 0) {
      // 最初のレコードの前に対象の既存データを削除
      const targetIds = new Set<number>();
      for (const r of parsed.rows) {
        const tid = await resolveTargetIdByTaskNo(wbsId, r.taskNo);
        if (tid) targetIds.add(tid);
      }
      for (const tid of targetIds) {
        await findingRepo.deleteByTargetId(tid);
      }
    }

    await findingRepo.create(
      QualityFinding.create({
        targetId,
        source: row.source,
        injectionPhase: row.injectionPhase,
        phenomenonType: row.phenomenonType,
        causeType: row.causeType,
        category: row.category,
        description: row.description,
        foundAt: row.foundAt,
      })
    );
    created++;
  }

  revalidatePath(`/wbs/${wbsId}/quality`);
  return { success: errors.length === 0, created, errors };
}

export async function importQualitySizeMetricsCsv(
  wbsId: number,
  rows: SizeCsvRow[],
  _mode: "merge" | "replace", // eslint-disable-line @typescript-eslint/no-unused-vars
): Promise<ImportQualityCsvResult> {
  const parsed = parseSizeRows(rows);
  const errors = [...parsed.errors];
  const metricRepo = getSizeMetricRepo();

  let created = 0;
  for (let i = 0; i < parsed.rows.length; i++) {
    const row = parsed.rows[i];
    const targetId = await resolveTargetIdByTaskNo(wbsId, row.taskNo);
    if (targetId === null) {
      errors.push({ line: i + 2, message: `評価対象が見つかりません: ${row.taskNo}` });
      continue;
    }

    await metricRepo.upsert(
      QualitySizeMetric.create({
        targetId,
        unit: row.unit,
        value: row.value,
        measuredAt: row.measuredAt,
        note: row.note,
      })
    );
    created++;
  }

  revalidatePath(`/wbs/${wbsId}/quality`);
  return { success: errors.length === 0, created, errors };
}

export async function importQualityTestProgressCsv(
  wbsId: number,
  rows: TestProgressCsvRow[],
): Promise<ImportQualityCsvResult> {
  const parsed = parseTestProgressRows(rows);
  const errors = [...parsed.errors];
  const progressRepo = getTestProgressRepo();

  let created = 0;
  for (let i = 0; i < parsed.rows.length; i++) {
    const row = parsed.rows[i];
    const targetId = await resolveTargetIdByTaskNo(wbsId, row.taskNo);
    if (targetId === null) {
      errors.push({ line: i + 2, message: `評価対象が見つかりません: ${row.taskNo}` });
      continue;
    }

    await progressRepo.upsert(
      QualityTestProgress.create({
        targetId,
        date: row.date,
        plannedTotal: row.plannedTotal,
        executedTotal: row.executedTotal,
        passedTotal: row.passedTotal,
        failedTotal: row.failedTotal,
        blockedTotal: row.blockedTotal,
      })
    );
    created++;
  }

  revalidatePath(`/wbs/${wbsId}/quality`);
  return { success: errors.length === 0, created, errors };
}

export async function importQualityTargetAttributesCsv(
  wbsId: number,
  rows: TargetAttributeCsvRow[],
): Promise<ImportQualityCsvResult> {
  const parsed = parseTargetAttributeRows(rows);
  const errors = [...parsed.errors];
  const targetService = getTargetService();

  let created = 0;
  for (let i = 0; i < parsed.rows.length; i++) {
    const row = parsed.rows[i];
    try {
      await targetService.updateAttributes(wbsId, row.taskNo, {
        subsystem: row.subsystem,
        featureGroup: row.featureGroup,
      });
      created++;
    } catch {
      errors.push({ line: i + 2, message: `評価対象が見つかりません: ${row.taskNo}` });
    }
  }

  revalidatePath(`/wbs/${wbsId}/quality`);
  return { success: errors.length === 0, created, errors };
}
