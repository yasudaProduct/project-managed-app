import { injectable, inject } from 'inversify';
import { SYMBOL } from '@/types/symbol';
import type { IQualityReviewTargetRepository, IQualityReviewerRepository } from './i-quality-review-target.repository';
import type { IQualitySizeMetricRepository, IQualityFindingRepository, IQualityMetricsReadRepository } from './i-quality-metrics.repository';
import type { IQualityTaskRepository } from './i-quality-task.repository';
import { QualitySizeMetric } from '@/domains/quality/quality-size-metric';
import { QualityFinding } from '@/domains/quality/quality-finding';
import { QualityMetricsCalculator } from '@/domains/quality/quality-metrics-calculator';
import { QualitySizeUnit, QualitySeverity } from '@/domains/quality/value-objects/quality-enums';
import { QualityStatus } from '@/domains/quality/value-objects/quality-status';
import type { QualityThresholds } from '@/domains/quality/value-objects/quality-threshold';

export interface RegisterSizeMetricInput {
  targetId: number;
  unit: QualitySizeUnit;
  value: number;
  measuredAt: Date;
  note?: string;
}

export interface RegisterFindingInput {
  targetId: number;
  severity: QualitySeverity;
  category?: string;
  description?: string;
  foundAt: Date;
}

export interface UpdateFindingInput extends RegisterFindingInput {
  id: number;
}

export interface QualityMetricsSummary {
  targetId: number;
  reviewManHours: number;
  size: number | null;
  sizeUnit: QualitySizeUnit | 'MAN_HOUR';
  findingCount: number;
  majorCount: number;
  reviewDensity: number | null;
  defectDensity: number | null;
  majorDefectDensity: number | null;
  majorRatio: number | null;
  status: QualityStatus | null;
}

export interface QualityTargetListItem {
  id: number;
  wbsId: number;
  taskNo: string;
  name: string;
  isActive: boolean;
  reviewerCount: number;
  findingCount: number;
  majorCount: number;
  phase?: string | null;
}

export interface QualityIndicator {
  value: number | null;
  status: QualityStatus | null;
}

export interface WbsQualitySummary {
  wbsId: number;
  sizeUnit: QualitySizeUnit | 'MAN_HOUR';
  targetCount: number;
  totalSize: number;
  totalReviewManHours: number;
  totalFindingCount: number;
  totalMajorCount: number;
  reviewedTargetCount: number;
  reviewDensity: QualityIndicator;
  defectDensity: QualityIndicator;
  majorDefectDensity: QualityIndicator;
  reviewCompletionRate: QualityIndicator;
}

export interface QualityTrendPoint {
  date: string; // YYYY-MM-DD
  findingCount: number;
  majorCount: number;
  reviewManHours: number;
  cumulativeFindings: number;
  cumulativeMajor: number;
  cumulativeReviewManHours: number;
  defectDensity: number | null;
  majorDefectDensity: number | null;
  reviewDensity: number | null;
}

export interface GetTrendInput {
  wbsId: number;
  sizeUnit: QualitySizeUnit | 'MAN_HOUR';
  fromDate?: Date;
  toDate?: Date;
  phase?: string;
}

export type AggregationAxis = 'target' | 'phase' | 'reviewer' | 'date';

export interface AggregatedQualityRow {
  axis: AggregationAxis;
  key: string;
  label: string;
  targetCount: number;
  totalSize: number;
  totalReviewManHours: number;
  findingCount: number;
  majorCount: number;
  reviewDensity: number | null;
  defectDensity: number | null;
  majorDefectDensity: number | null;
  majorRatio: number | null;
}

export interface WbsFindingItem {
  id: number;
  targetId: number;
  taskNo: string;
  targetName: string;
  phase: string | null;
  severity: QualitySeverity;
  category: string | null;
  description: string | null;
  foundAt: Date;
}

export interface IQualityApplicationService {
  registerSizeMetric(input: RegisterSizeMetricInput): Promise<QualitySizeMetric>;
  deleteSizeMetric(targetId: number, unit: QualitySizeUnit): Promise<void>;
  registerFinding(input: RegisterFindingInput): Promise<QualityFinding>;
  updateFinding(input: UpdateFindingInput): Promise<QualityFinding>;
  deleteFinding(id: number): Promise<void>;
  importFindings(targetId: number, findings: Omit<RegisterFindingInput, 'targetId'>[], mode: 'merge' | 'replace'): Promise<{ created: number }>;
  importSizeMetrics(items: RegisterSizeMetricInput[], mode: 'merge' | 'replace'): Promise<{ created: number }>;
  getSummary(targetId: number, sizeUnit: QualitySizeUnit | 'MAN_HOUR', thresholds?: QualityThresholds): Promise<QualityMetricsSummary>;
  listTargetsByWbs(wbsId: number, isActive?: boolean): Promise<QualityTargetListItem[]>;
  listFindings(targetId: number): Promise<QualityFinding[]>;
  listWbsFindings(wbsId: number): Promise<WbsFindingItem[]>;
  listSizeMetrics(targetId: number): Promise<QualitySizeMetric[]>;
  getWbsSummary(
    wbsId: number,
    sizeUnit: QualitySizeUnit | 'MAN_HOUR',
    thresholds?: QualityThresholds,
  ): Promise<WbsQualitySummary>;
  getTrend(input: GetTrendInput): Promise<QualityTrendPoint[]>;
  getAggregated(
    wbsId: number,
    axis: AggregationAxis,
    sizeUnit: QualitySizeUnit | 'MAN_HOUR',
  ): Promise<AggregatedQualityRow[]>;
}

@injectable()
export class QualityApplicationService implements IQualityApplicationService {
  private readonly calc = new QualityMetricsCalculator();

  constructor(
    @inject(SYMBOL.IQualityReviewTargetRepository)
    private readonly targetRepo: IQualityReviewTargetRepository,
    @inject(SYMBOL.IQualityReviewerRepository)
    private readonly reviewerRepo: IQualityReviewerRepository,
    @inject(SYMBOL.IQualitySizeMetricRepository)
    private readonly sizeRepo: IQualitySizeMetricRepository,
    @inject(SYMBOL.IQualityFindingRepository)
    private readonly findingRepo: IQualityFindingRepository,
    @inject(SYMBOL.IQualityMetricsReadRepository)
    private readonly readRepo: IQualityMetricsReadRepository,
    @inject(SYMBOL.IQualityTaskRepository)
    private readonly taskRepo: IQualityTaskRepository,
  ) {}

  async registerSizeMetric(input: RegisterSizeMetricInput): Promise<QualitySizeMetric> {
    const metric = QualitySizeMetric.create({
      targetId: input.targetId,
      unit: input.unit,
      value: input.value,
      measuredAt: input.measuredAt,
      note: input.note,
    });
    return this.sizeRepo.upsert(metric);
  }

  async deleteSizeMetric(targetId: number, unit: QualitySizeUnit): Promise<void> {
    await this.sizeRepo.deleteByTargetAndUnit(targetId, unit);
  }

  async registerFinding(input: RegisterFindingInput): Promise<QualityFinding> {
    const finding = QualityFinding.create({
      targetId: input.targetId,
      severity: input.severity,
      category: input.category,
      description: input.description,
      foundAt: input.foundAt,
    });
    return this.findingRepo.create(finding);
  }

  async updateFinding(input: UpdateFindingInput): Promise<QualityFinding> {
    const finding = QualityFinding.reconstruct({
      id: input.id,
      targetId: input.targetId,
      severity: input.severity,
      category: input.category,
      description: input.description,
      foundAt: input.foundAt,
    });
    return this.findingRepo.update(finding);
  }

  async deleteFinding(id: number): Promise<void> {
    await this.findingRepo.delete(id);
  }

  async importFindings(
    targetId: number,
    findings: Omit<RegisterFindingInput, 'targetId'>[],
    mode: 'merge' | 'replace',
  ): Promise<{ created: number }> {
    if (mode === 'replace') {
      await this.findingRepo.deleteByTargetId(targetId);
    }

    let created = 0;
    for (const f of findings) {
      await this.registerFinding({ ...f, targetId });
      created++;
    }
    return { created };
  }

  async importSizeMetrics(
    items: RegisterSizeMetricInput[],
    mode: 'merge' | 'replace',
  ): Promise<{ created: number }> {
    if (mode === 'replace') {
      for (const item of items) {
        await this.sizeRepo.deleteByTargetAndUnit(item.targetId, item.unit);
      }
    }

    let created = 0;
    for (const item of items) {
      await this.registerSizeMetric(item);
      created++;
    }
    return { created };
  }

  async getSummary(
    targetId: number,
    sizeUnit: QualitySizeUnit | 'MAN_HOUR',
    thresholds?: QualityThresholds,
  ): Promise<QualityMetricsSummary> {
    const target = await this.targetRepo.findById(targetId);
    if (!target) throw new Error(`評価対象が見つかりません: ${targetId}`);

    const { total: findingCount, major: majorCount } = await this.findingRepo.countByTarget(targetId);

    let reviewManHours = 0;
    let size: number | null = null;

    if (sizeUnit === 'MAN_HOUR') {
      const manHoursResult = await this.readRepo.getTaskManHours([
        { wbsId: target.wbsId, taskNo: target.taskNo },
      ]);
      size = manHoursResult[0]?.totalHours ?? 0;
    } else {
      const metrics = await this.sizeRepo.findByTarget(targetId);
      const metric = metrics.find((m) => m.unit === sizeUnit);
      size = metric?.value ?? null;
    }

    const reviewers = await this.reviewerRepo.findByTarget(targetId);
    const reviewTaskNos = reviewers.map((r) => ({ wbsId: target.wbsId, taskNo: r.reviewTaskNo }));
    const reviewHoursResult = await this.readRepo.getReviewManHours(reviewTaskNos);
    reviewManHours = reviewHoursResult.reduce((sum, r) => sum + r.totalHours, 0);

    const reviewDensity = this.calc.calcReviewDensity(reviewManHours, size ?? 0);
    const defectDensity = this.calc.calcDefectDensity(findingCount, size ?? 0);
    const majorDefectDensity = this.calc.calcMajorDefectDensity(majorCount, size ?? 0);
    const majorRatio = this.calc.calcMajorRatio(majorCount, findingCount);

    const status = thresholds?.defectDensity
      ? this.calc.evaluateStatus(defectDensity, thresholds.defectDensity)
      : QualityStatus.NORMAL;

    return {
      targetId,
      reviewManHours,
      size,
      sizeUnit,
      findingCount,
      majorCount,
      reviewDensity,
      defectDensity,
      majorDefectDensity,
      majorRatio,
      status,
    };
  }

  async listTargetsByWbs(wbsId: number, isActive?: boolean): Promise<QualityTargetListItem[]> {
    const targets = await this.targetRepo.findByWbs(wbsId, isActive !== undefined ? { isActive } : undefined);
    const phaseMap = await this.taskRepo.findPhasesByTaskNos(
      wbsId,
      targets.map((t) => t.taskNo),
    );

    const items: QualityTargetListItem[] = [];
    for (const t of targets) {
      const reviewers = await this.reviewerRepo.findByTarget(t.id!);
      const counts = await this.findingRepo.countByTarget(t.id!);
      items.push({
        id: t.id!,
        wbsId: t.wbsId,
        taskNo: t.taskNo,
        name: t.name,
        isActive: t.isActive,
        reviewerCount: reviewers.length,
        findingCount: counts.total,
        majorCount: counts.major,
        phase: phaseMap.get(t.taskNo) ?? null,
      });
    }
    return items;
  }

  async listFindings(targetId: number): Promise<QualityFinding[]> {
    return this.findingRepo.findByTarget(targetId);
  }

  async listWbsFindings(wbsId: number): Promise<WbsFindingItem[]> {
    const targets = await this.targetRepo.findByWbs(wbsId, { isActive: true });
    if (targets.length === 0) return [];
    const taskNos = targets.map((t) => t.taskNo);
    const [findings, phaseMap] = await Promise.all([
      this.findingRepo.findByTargetIds(targets.map((t) => t.id!)),
      this.taskRepo.findPhasesByTaskNos(wbsId, taskNos),
    ]);
    const targetMap = new Map(targets.map((t) => [t.id!, t]));
    return findings.map((f) => {
      const target = targetMap.get(f.targetId)!;
      return {
        id: f.id!,
        targetId: f.targetId,
        taskNo: target.taskNo,
        targetName: target.name,
        phase: phaseMap.get(target.taskNo) ?? null,
        severity: f.severity,
        category: f.category ?? null,
        description: f.description ?? null,
        foundAt: f.foundAt,
      };
    });
  }

  async listSizeMetrics(targetId: number): Promise<QualitySizeMetric[]> {
    return this.sizeRepo.findByTarget(targetId);
  }

  async getWbsSummary(
    wbsId: number,
    sizeUnit: QualitySizeUnit | 'MAN_HOUR',
    thresholds?: QualityThresholds,
  ): Promise<WbsQualitySummary> {
    const targets = await this.targetRepo.findByWbs(wbsId, { isActive: true });

    let totalSize = 0;
    let totalReviewManHours = 0;
    let totalFindingCount = 0;
    let totalMajorCount = 0;
    let reviewedTargetCount = 0;

    for (const t of targets) {
      const { total: f, major: m } = await this.findingRepo.countByTarget(t.id!);
      totalFindingCount += f;
      totalMajorCount += m;

      if (sizeUnit === 'MAN_HOUR') {
        const mh = await this.readRepo.getTaskManHours([
          { wbsId: t.wbsId, taskNo: t.taskNo },
        ]);
        totalSize += mh[0]?.totalHours ?? 0;
      } else {
        const metrics = await this.sizeRepo.findByTarget(t.id!);
        const metric = metrics.find((x) => x.unit === sizeUnit);
        totalSize += metric?.value ?? 0;
      }

      const reviewers = await this.reviewerRepo.findByTarget(t.id!);
      if (reviewers.length > 0) {
        const reviewHoursResult = await this.readRepo.getReviewManHours(
          reviewers.map((r) => ({ wbsId: t.wbsId, taskNo: r.reviewTaskNo })),
        );
        const hours = reviewHoursResult.reduce((sum, x) => sum + x.totalHours, 0);
        totalReviewManHours += hours;
        if (hours > 0) reviewedTargetCount++;
      }
    }

    const reviewDensityValue = this.calc.calcReviewDensity(
      totalReviewManHours,
      totalSize,
    );
    const defectDensityValue = this.calc.calcDefectDensity(
      totalFindingCount,
      totalSize,
    );
    const majorDefectDensityValue = this.calc.calcMajorDefectDensity(
      totalMajorCount,
      totalSize,
    );
    const reviewCompletionRateValue = this.calc.calcReviewCompletionRate(
      reviewedTargetCount,
      targets.length,
    );

    return {
      wbsId,
      sizeUnit,
      targetCount: targets.length,
      totalSize,
      totalReviewManHours,
      totalFindingCount,
      totalMajorCount,
      reviewedTargetCount,
      reviewDensity: {
        value: reviewDensityValue,
        status: this.calc.evaluateStatus(
          reviewDensityValue,
          thresholds?.reviewDensity ?? null,
        ),
      },
      defectDensity: {
        value: defectDensityValue,
        status: this.calc.evaluateStatus(
          defectDensityValue,
          thresholds?.defectDensity ?? null,
        ),
      },
      majorDefectDensity: {
        value: majorDefectDensityValue,
        status: this.calc.evaluateStatus(
          majorDefectDensityValue,
          thresholds?.majorDefectDensity ?? null,
        ),
      },
      reviewCompletionRate: {
        value: reviewCompletionRateValue,
        status: this.calc.evaluateStatus(reviewCompletionRateValue, null),
      },
    };
  }

  async getAggregated(
    wbsId: number,
    axis: AggregationAxis,
    sizeUnit: QualitySizeUnit | 'MAN_HOUR',
  ): Promise<AggregatedQualityRow[]> {
    const targets = await this.targetRepo.findByWbs(wbsId, { isActive: true });
    if (targets.length === 0) return [];

    const phaseMap = await this.taskRepo.findPhasesByTaskNos(
      wbsId,
      targets.map((t) => t.taskNo),
    );

    type Bucket = {
      key: string;
      label: string;
      targetIds: Set<number>;
      totalSize: number;
      totalReviewManHours: number;
      findingCount: number;
      majorCount: number;
    };
    const buckets = new Map<string, Bucket>();
    const ensureBucket = (key: string, label: string): Bucket => {
      let b = buckets.get(key);
      if (!b) {
        b = {
          key,
          label,
          targetIds: new Set(),
          totalSize: 0,
          totalReviewManHours: 0,
          findingCount: 0,
          majorCount: 0,
        };
        buckets.set(key, b);
      }
      return b;
    };

    for (const t of targets) {
      const { total: fTotal, major: fMajor } =
        await this.findingRepo.countByTarget(t.id!);

      let size = 0;
      if (sizeUnit === 'MAN_HOUR') {
        const mh = await this.readRepo.getTaskManHours([
          { wbsId: t.wbsId, taskNo: t.taskNo },
        ]);
        size = mh[0]?.totalHours ?? 0;
      } else {
        const metrics = await this.sizeRepo.findByTarget(t.id!);
        const m = metrics.find((x) => x.unit === sizeUnit);
        size = m?.value ?? 0;
      }

      const reviewers = await this.reviewerRepo.findByTarget(t.id!);
      let reviewHours = 0;
      if (reviewers.length > 0) {
        const rh = await this.readRepo.getReviewManHours(
          reviewers.map((r) => ({ wbsId: t.wbsId, taskNo: r.reviewTaskNo })),
        );
        reviewHours = rh.reduce((sum, x) => sum + x.totalHours, 0);
      }

      if (axis === 'target') {
        const b = ensureBucket(t.taskNo, t.name);
        b.targetIds.add(t.id!);
        b.totalSize += size;
        b.totalReviewManHours += reviewHours;
        b.findingCount += fTotal;
        b.majorCount += fMajor;
      } else if (axis === 'phase') {
        const phase = phaseMap.get(t.taskNo) ?? null;
        const key = phase ?? '__none__';
        const label = phase ?? '(未割当)';
        const b = ensureBucket(key, label);
        b.targetIds.add(t.id!);
        b.totalSize += size;
        b.totalReviewManHours += reviewHours;
        b.findingCount += fTotal;
        b.majorCount += fMajor;
      } else if (axis === 'reviewer') {
        if (reviewers.length === 0) {
          const b = ensureBucket('__none__', '(レビュアー未割当)');
          b.targetIds.add(t.id!);
          b.totalSize += size;
          b.findingCount += fTotal;
          b.majorCount += fMajor;
        } else {
          const perReviewer = reviewers.length;
          const rh = await this.readRepo.getReviewManHours(
            reviewers.map((r) => ({ wbsId: t.wbsId, taskNo: r.reviewTaskNo })),
          );
          const hoursByTaskNo = new Map(
            rh.map((x) => [x.taskNo, x.totalHours]),
          );
          for (const r of reviewers) {
            const b = ensureBucket(r.reviewerUserId, r.reviewerUserId);
            b.targetIds.add(t.id!);
            b.totalSize += size / perReviewer;
            b.totalReviewManHours += hoursByTaskNo.get(r.reviewTaskNo) ?? 0;
            b.findingCount += fTotal / perReviewer;
            b.majorCount += fMajor / perReviewer;
          }
        }
      } else if (axis === 'date') {
        const findings = await this.findingRepo.findByTarget(t.id!);
        for (const f of findings) {
          const dateKey = f.foundAt.toISOString().split('T')[0];
          const b = ensureBucket(dateKey, dateKey);
          b.targetIds.add(t.id!);
          b.findingCount += 1;
          if (f.severity === QualitySeverity.MAJOR) b.majorCount += 1;
        }
        if (reviewers.length > 0) {
          const rtk = reviewers.map((r) => ({
            wbsId: t.wbsId,
            taskNo: r.reviewTaskNo,
          }));
          const dailyHours = await this.readRepo.getDailyReviewManHours(rtk);
          for (const dh of dailyHours) {
            const dateKey = dh.date.toISOString().split('T')[0];
            const b = ensureBucket(dateKey, dateKey);
            b.targetIds.add(t.id!);
            b.totalReviewManHours += dh.totalHours;
          }
        }
      }
    }

    const rows: AggregatedQualityRow[] = Array.from(buckets.values())
      .sort((a, b) => a.key.localeCompare(b.key))
      .map((b) => ({
        axis,
        key: b.key,
        label: b.label,
        targetCount: b.targetIds.size,
        totalSize: b.totalSize,
        totalReviewManHours: b.totalReviewManHours,
        findingCount: b.findingCount,
        majorCount: b.majorCount,
        reviewDensity: this.calc.calcReviewDensity(
          b.totalReviewManHours,
          b.totalSize,
        ),
        defectDensity: this.calc.calcDefectDensity(b.findingCount, b.totalSize),
        majorDefectDensity: this.calc.calcMajorDefectDensity(
          b.majorCount,
          b.totalSize,
        ),
        majorRatio: this.calc.calcMajorRatio(b.majorCount, b.findingCount),
      }));
    return rows;
  }

  async getTrend(input: GetTrendInput): Promise<QualityTrendPoint[]> {
    const { wbsId, sizeUnit, fromDate, toDate, phase } = input;
    const allTargets = await this.targetRepo.findByWbs(wbsId, { isActive: true });
    if (allTargets.length === 0) return [];

    let targets = allTargets;
    if (phase) {
      const phaseMap = await this.taskRepo.findPhasesByTaskNos(
        wbsId,
        allTargets.map((t) => t.taskNo),
      );
      targets = allTargets.filter((t) => phaseMap.get(t.taskNo) === phase);
      if (targets.length === 0) return [];
    }

    const targetIds = targets.map((t) => t.id!).filter((id) => id != null);
    const findingsByDate = await this.readRepo.getDailyFindingCounts(
      targetIds,
      fromDate,
      toDate,
    );

    const reviewTaskKeys: { wbsId: number; taskNo: string }[] = [];
    for (const t of targets) {
      const reviewers = await this.reviewerRepo.findByTarget(t.id!);
      for (const r of reviewers) {
        reviewTaskKeys.push({ wbsId: t.wbsId, taskNo: r.reviewTaskNo });
      }
    }
    const hoursByDate = await this.readRepo.getDailyReviewManHours(
      reviewTaskKeys,
      fromDate,
      toDate,
    );

    let totalSize = 0;
    for (const t of targets) {
      if (sizeUnit === 'MAN_HOUR') {
        const mh = await this.readRepo.getTaskManHours([
          { wbsId: t.wbsId, taskNo: t.taskNo },
        ]);
        totalSize += mh[0]?.totalHours ?? 0;
      } else {
        const metrics = await this.sizeRepo.findByTarget(t.id!);
        const metric = metrics.find((x) => x.unit === sizeUnit);
        totalSize += metric?.value ?? 0;
      }
    }

    const dateSet = new Set<string>();
    for (const f of findingsByDate) {
      dateSet.add(f.date.toISOString().split('T')[0]);
    }
    for (const h of hoursByDate) {
      dateSet.add(h.date.toISOString().split('T')[0]);
    }
    const sortedDates = Array.from(dateSet).sort();

    const findingsMap = new Map(
      findingsByDate.map((f) => [f.date.toISOString().split('T')[0], f]),
    );
    const hoursMap = new Map(
      hoursByDate.map((h) => [h.date.toISOString().split('T')[0], h]),
    );

    let cumulativeFindings = 0;
    let cumulativeMajor = 0;
    let cumulativeReviewManHours = 0;

    const points: QualityTrendPoint[] = [];
    for (const date of sortedDates) {
      const f = findingsMap.get(date);
      const h = hoursMap.get(date);
      const dailyFindings = f?.total ?? 0;
      const dailyMajor = f?.major ?? 0;
      const dailyHours = h?.totalHours ?? 0;

      cumulativeFindings += dailyFindings;
      cumulativeMajor += dailyMajor;
      cumulativeReviewManHours += dailyHours;

      points.push({
        date,
        findingCount: dailyFindings,
        majorCount: dailyMajor,
        reviewManHours: dailyHours,
        cumulativeFindings,
        cumulativeMajor,
        cumulativeReviewManHours,
        defectDensity: this.calc.calcDefectDensity(cumulativeFindings, totalSize),
        majorDefectDensity: this.calc.calcMajorDefectDensity(
          cumulativeMajor,
          totalSize,
        ),
        reviewDensity: this.calc.calcReviewDensity(
          cumulativeReviewManHours,
          totalSize,
        ),
      });
    }

    return points;
  }
}
