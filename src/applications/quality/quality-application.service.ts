import { injectable, inject } from 'inversify';
import { SYMBOL } from '@/types/symbol';
import type { IQualityReviewTargetRepository, IQualityReviewerRepository } from './i-quality-review-target.repository';
import type { IQualitySizeMetricRepository, IQualityFindingRepository, IQualityMetricsReadRepository } from './i-quality-metrics.repository';
import type { IQualityTaskRepository } from './i-quality-task.repository';
import { QualitySizeMetric } from '@/domains/quality/quality-size-metric';
import { QualityFinding } from '@/domains/quality/quality-finding';
import { QualityMetricsCalculator } from '@/domains/quality/quality-metrics-calculator';
import { QualitySizeUnit, FindingSource } from '@/domains/quality/value-objects/quality-enums';
import { QualityStatus } from '@/domains/quality/value-objects/quality-status';
import { getMetricDefinitions, shouldShowReviewCompletionRate, type MetricDefinition } from '@/domains/quality/value-objects/metric-definition';

export interface RegisterSizeMetricInput {
  targetId: number;
  unit: QualitySizeUnit;
  value: number;
  measuredAt: Date;
  note?: string;
}

export interface RegisterFindingInput {
  targetId: number;
  source?: FindingSource;
  category?: string;
  description?: string;
  foundAt: Date;
}

export interface UpdateFindingInput extends RegisterFindingInput {
  id: number;
}

export interface QualityTargetSizeByUnit {
  MAN_HOUR: number | null;
  PAGE: number | null;
  LINES_OF_CODE: number | null;
  TEST_CASE: number | null;
}

export interface QualityTargetListItem {
  id: number;
  wbsId: number;
  taskNo: string;
  name: string;
  isActive: boolean;
  reviewerCount: number;
  reviewerNames: string[];
  revieweeName: string | null;
  findingCount: number;
  phase?: string | null;
  sizeByUnit: QualityTargetSizeByUnit;
  reviewManHours: number;
  metrics: Record<string, number | null>;
}

export interface FindingsByReviewee {
  revieweeName: string;
  count: number;
}

export interface FindingsByCategory {
  category: string;
  count: number;
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
  reviewedTargetCount: number;
  metrics: Record<string, QualityIndicator>;
  reviewCompletionRate?: QualityIndicator;
}

export interface QualityTrendPoint {
  date: string; // YYYY-MM-DD
  findingCount: number;
  reviewManHours: number;
  cumulativeFindings: number;
  cumulativeReviewManHours: number;
  metrics: Record<string, number | null>;
}

export interface GetTrendInput {
  wbsId: number;
  sizeUnit: QualitySizeUnit | 'MAN_HOUR';
  fromDate?: Date;
  toDate?: Date;
  phase?: string;
}

export interface WbsFindingItem {
  id: number;
  targetId: number;
  taskNo: string;
  targetName: string;
  phase: string | null;
  source: FindingSource;
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
  listTargetsByWbs(
    wbsId: number,
    sizeUnit: QualitySizeUnit | 'MAN_HOUR',
    isActive?: boolean,
  ): Promise<QualityTargetListItem[]>;
  listFindings(targetId: number): Promise<QualityFinding[]>;
  listWbsFindings(wbsId: number): Promise<WbsFindingItem[]>;
  listSizeMetrics(targetId: number): Promise<QualitySizeMetric[]>;
  getWbsSummary(
    wbsId: number,
    sizeUnit: QualitySizeUnit | 'MAN_HOUR',
  ): Promise<WbsQualitySummary>;
  getTrend(input: GetTrendInput): Promise<QualityTrendPoint[]>;
  getFindingsByReviewee(wbsId: number): Promise<FindingsByReviewee[]>;
  getFindingsByCategory(wbsId: number): Promise<FindingsByCategory[]>;
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
      source: input.source,
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
      source: input.source,
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

  private resolveNumerator(
    def: MetricDefinition,
    ctx: {
      reviewManHours: number;
      findingCount: number;
      findingCountBySource: Record<string, number>;
      sizeByUnit: QualityTargetSizeByUnit;
    },
  ): number {
    if (def.numerator.source === 'reviewManHours') return ctx.reviewManHours;
    if (def.numerator.source === 'findingCount') {
      const src = def.numerator.findingSource;
      return src ? (ctx.findingCountBySource[src] ?? 0) : ctx.findingCount;
    }
    if (def.numerator.source === 'sizeMetric' && def.numerator.sizeUnit) {
      return ctx.sizeByUnit[def.numerator.sizeUnit] ?? 0;
    }
    return 0;
  }

  private resolveDenominator(
    def: MetricDefinition,
    selectedSize: number,
    sizeByUnit: QualityTargetSizeByUnit,
  ): number {
    if (def.denominator.source === 'selectedSize') return selectedSize;
    if (def.denominator.source === 'sizeMetric' && def.denominator.sizeUnit) {
      return sizeByUnit[def.denominator.sizeUnit] ?? 0;
    }
    return 0;
  }

  async listTargetsByWbs(
    wbsId: number,
    sizeUnit: QualitySizeUnit | 'MAN_HOUR',
    isActive?: boolean,
  ): Promise<QualityTargetListItem[]> {
    const targets = await this.targetRepo.findByWbs(
      wbsId,
      isActive !== undefined ? { isActive } : undefined,
    );
    if (targets.length === 0) return [];

    const taskNos = targets.map((t) => t.taskNo);
    const [phaseMap, revieweeMap] = await Promise.all([
      this.taskRepo.findPhasesByTaskNos(wbsId, taskNos),
      this.taskRepo.findAssigneesByTaskNos(wbsId, taskNos),
    ]);

    const perTargetReviewers = new Map<number, Awaited<ReturnType<IQualityReviewerRepository['findByTarget']>>>();
    const reviewerIds = new Set<string>();
    for (const t of targets) {
      const reviewers = await this.reviewerRepo.findByTarget(t.id!);
      perTargetReviewers.set(t.id!, reviewers);
      for (const r of reviewers) reviewerIds.add(r.reviewerUserId);
    }
    const userNameMap = await this.taskRepo.findUserNamesByIds(
      Array.from(reviewerIds),
    );

    const taskManHoursMap = new Map<string, number>();
    if (sizeUnit === 'MAN_HOUR') {
      const mh = await this.readRepo.getTaskManHours(
        targets.map((t) => ({ wbsId: t.wbsId, taskNo: t.taskNo })),
      );
      for (const r of mh) taskManHoursMap.set(r.taskNo, r.totalHours);
    }

    const definitions = getMetricDefinitions(sizeUnit);
    const items: QualityTargetListItem[] = [];
    for (const t of targets) {
      const reviewers = perTargetReviewers.get(t.id!) ?? [];
      const reviewerNames = reviewers
        .map((r) => userNameMap.get(r.reviewerUserId) ?? r.reviewerUserId)
        .filter((n): n is string => !!n);

      const counts = await this.findingRepo.countByTarget(t.id!);
      const sizeMetrics = await this.sizeRepo.findByTarget(t.id!);
      const sizeByUnit: QualityTargetSizeByUnit = {
        MAN_HOUR:
          sizeUnit === 'MAN_HOUR'
            ? taskManHoursMap.get(t.taskNo) ?? null
            : await this.getTaskManHoursSingle(t.wbsId, t.taskNo),
        PAGE: sizeMetrics.find((m) => m.unit === QualitySizeUnit.PAGE)?.value ?? null,
        LINES_OF_CODE:
          sizeMetrics.find((m) => m.unit === QualitySizeUnit.LINES_OF_CODE)?.value ?? null,
        TEST_CASE:
          sizeMetrics.find((m) => m.unit === QualitySizeUnit.TEST_CASE)?.value ?? null,
      };

      let reviewManHours = 0;
      if (reviewers.length > 0) {
        const rh = await this.readRepo.getReviewManHours(
          reviewers.map((r) => ({ wbsId: t.wbsId, taskNo: r.reviewTaskNo })),
        );
        reviewManHours = rh.reduce((sum, x) => sum + x.totalHours, 0);
      }

      const selectedSize = this.getSelectedSize(sizeUnit, sizeByUnit);

      const reviewCounts = await this.findingRepo.countByTarget(t.id!, FindingSource.REVIEW);
      const testCounts = await this.findingRepo.countByTarget(t.id!, FindingSource.TEST);
      const findingCountBySource: Record<string, number> = {
        [FindingSource.REVIEW]: reviewCounts.total,
        [FindingSource.TEST]: testCounts.total,
      };

      const metrics: Record<string, number | null> = {};
      for (const def of definitions) {
        const num = this.resolveNumerator(def, {
          reviewManHours,
          findingCount: counts.total,
          findingCountBySource,
          sizeByUnit,
        });
        const den = this.resolveDenominator(def, selectedSize, sizeByUnit);
        metrics[def.key] = this.calc.calcDensity(num, den, def.scaleFactor);
      }

      items.push({
        id: t.id!,
        wbsId: t.wbsId,
        taskNo: t.taskNo,
        name: t.name,
        isActive: t.isActive,
        reviewerCount: reviewers.length,
        reviewerNames,
        revieweeName: revieweeMap.get(t.taskNo) ?? null,
        findingCount: counts.total,
        phase: phaseMap.get(t.taskNo) ?? null,
        sizeByUnit,
        reviewManHours,
        metrics,
      });
    }
    return items;
  }

  private getSelectedSize(
    sizeUnit: QualitySizeUnit | 'MAN_HOUR',
    sizeByUnit: QualityTargetSizeByUnit,
  ): number {
    if (sizeUnit === 'MAN_HOUR') return sizeByUnit.MAN_HOUR ?? 0;
    return sizeByUnit[sizeUnit] ?? 0;
  }

  private async getTaskManHoursSingle(
    wbsId: number,
    taskNo: string,
  ): Promise<number | null> {
    const r = await this.readRepo.getTaskManHours([{ wbsId, taskNo }]);
    return r[0]?.totalHours ?? null;
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
        source: f.source,
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
  ): Promise<WbsQualitySummary> {
    const targets = await this.targetRepo.findByWbs(wbsId, { isActive: true });

    let totalSize = 0;
    let totalReviewManHours = 0;
    let totalFindingCount = 0;
    let reviewedTargetCount = 0;
    const totalFindingBySource: Record<string, number> = {
      [FindingSource.REVIEW]: 0,
      [FindingSource.TEST]: 0,
    };
    const totalSizeByUnit: QualityTargetSizeByUnit = {
      MAN_HOUR: 0,
      PAGE: 0,
      LINES_OF_CODE: 0,
      TEST_CASE: 0,
    };

    for (const t of targets) {
      const { total: f } = await this.findingRepo.countByTarget(t.id!);
      totalFindingCount += f;

      const reviewCounts = await this.findingRepo.countByTarget(t.id!, FindingSource.REVIEW);
      const testCounts = await this.findingRepo.countByTarget(t.id!, FindingSource.TEST);
      totalFindingBySource[FindingSource.REVIEW] += reviewCounts.total;
      totalFindingBySource[FindingSource.TEST] += testCounts.total;

      if (sizeUnit === 'MAN_HOUR') {
        const mh = await this.readRepo.getTaskManHours([
          { wbsId: t.wbsId, taskNo: t.taskNo },
        ]);
        const hours = mh[0]?.totalHours ?? 0;
        totalSize += hours;
        totalSizeByUnit.MAN_HOUR = (totalSizeByUnit.MAN_HOUR ?? 0) + hours;
      } else {
        const metrics = await this.sizeRepo.findByTarget(t.id!);
        const metric = metrics.find((x) => x.unit === sizeUnit);
        totalSize += metric?.value ?? 0;
        for (const m of metrics) {
          const key = m.unit as keyof QualityTargetSizeByUnit;
          totalSizeByUnit[key] = (totalSizeByUnit[key] ?? 0) + m.value;
        }
      }

      if (sizeUnit !== 'MAN_HOUR') {
        const mhResult = await this.readRepo.getTaskManHours([
          { wbsId: t.wbsId, taskNo: t.taskNo },
        ]);
        totalSizeByUnit.MAN_HOUR = (totalSizeByUnit.MAN_HOUR ?? 0) + (mhResult[0]?.totalHours ?? 0);
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

    const definitions = getMetricDefinitions(sizeUnit);
    const metrics: Record<string, QualityIndicator> = {};
    for (const def of definitions) {
      const num = this.resolveNumerator(def, {
        reviewManHours: totalReviewManHours,
        findingCount: totalFindingCount,
        findingCountBySource: totalFindingBySource,
        sizeByUnit: totalSizeByUnit,
      });
      const den = this.resolveDenominator(def, totalSize, totalSizeByUnit);
      metrics[def.key] = {
        value: this.calc.calcDensity(num, den, def.scaleFactor),
        status: null,
      };
    }

    const result: WbsQualitySummary = {
      wbsId,
      sizeUnit,
      targetCount: targets.length,
      totalSize,
      totalReviewManHours,
      totalFindingCount,
      reviewedTargetCount,
      metrics,
    };

    if (shouldShowReviewCompletionRate(sizeUnit)) {
      result.reviewCompletionRate = {
        value: this.calc.calcReviewCompletionRate(reviewedTargetCount, targets.length),
        status: null,
      };
    }

    return result;
  }

  async getFindingsByReviewee(
    wbsId: number,
  ): Promise<FindingsByReviewee[]> {
    const targets = await this.targetRepo.findByWbs(wbsId, { isActive: true });
    if (targets.length === 0) return [];

    const revieweeMap = await this.taskRepo.findAssigneesByTaskNos(
      wbsId,
      targets.map((t) => t.taskNo),
    );
    const findings = await this.findingRepo.findByTargetIds(
      targets.map((t) => t.id!),
    );
    const targetById = new Map(targets.map((t) => [t.id!, t]));

    const buckets = new Map<string, FindingsByReviewee>();
    for (const f of findings) {
      const target = targetById.get(f.targetId);
      if (!target) continue;
      const reviewee = revieweeMap.get(target.taskNo) ?? null;
      const label = reviewee ?? '未割当';
      const b = buckets.get(label) ?? { revieweeName: label, count: 0 };
      b.count += 1;
      buckets.set(label, b);
    }
    return Array.from(buckets.values()).sort((a, b) => b.count - a.count);
  }

  async getFindingsByCategory(
    wbsId: number,
  ): Promise<FindingsByCategory[]> {
    const targets = await this.targetRepo.findByWbs(wbsId, { isActive: true });
    if (targets.length === 0) return [];

    const findings = await this.findingRepo.findByTargetIds(
      targets.map((t) => t.id!),
    );

    const buckets = new Map<string, FindingsByCategory>();
    for (const f of findings) {
      const label = f.category?.trim() ? f.category : '未分類';
      const b = buckets.get(label) ?? { category: label, count: 0 };
      b.count += 1;
      buckets.set(label, b);
    }
    return Array.from(buckets.values()).sort((a, b) => b.count - a.count);
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
    const totalSizeByUnit: QualityTargetSizeByUnit = {
      MAN_HOUR: 0,
      PAGE: 0,
      LINES_OF_CODE: 0,
      TEST_CASE: 0,
    };
    for (const t of targets) {
      if (sizeUnit === 'MAN_HOUR') {
        const mh = await this.readRepo.getTaskManHours([
          { wbsId: t.wbsId, taskNo: t.taskNo },
        ]);
        const hours = mh[0]?.totalHours ?? 0;
        totalSize += hours;
        totalSizeByUnit.MAN_HOUR = (totalSizeByUnit.MAN_HOUR ?? 0) + hours;
      } else {
        const metrics = await this.sizeRepo.findByTarget(t.id!);
        const metric = metrics.find((x) => x.unit === sizeUnit);
        totalSize += metric?.value ?? 0;
        for (const m of metrics) {
          const key = m.unit as keyof QualityTargetSizeByUnit;
          totalSizeByUnit[key] = (totalSizeByUnit[key] ?? 0) + m.value;
        }
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
    let cumulativeReviewManHours = 0;

    const definitions = getMetricDefinitions(sizeUnit);
    const points: QualityTrendPoint[] = [];
    for (const date of sortedDates) {
      const f = findingsMap.get(date);
      const h = hoursMap.get(date);
      const dailyFindings = f?.total ?? 0;
      const dailyHours = h?.totalHours ?? 0;

      cumulativeFindings += dailyFindings;
      cumulativeReviewManHours += dailyHours;

      const metrics: Record<string, number | null> = {};
      for (const def of definitions) {
        const num = this.resolveNumerator(def, {
          reviewManHours: cumulativeReviewManHours,
          findingCount: cumulativeFindings,
          findingCountBySource: {
            [FindingSource.REVIEW]: cumulativeFindings,
            [FindingSource.TEST]: cumulativeFindings,
          },
          sizeByUnit: totalSizeByUnit,
        });
        const den = this.resolveDenominator(def, totalSize, totalSizeByUnit);
        metrics[def.key] = this.calc.calcDensity(num, den, def.scaleFactor);
      }

      points.push({
        date,
        findingCount: dailyFindings,
        reviewManHours: dailyHours,
        cumulativeFindings,
        cumulativeReviewManHours,
        metrics,
      });
    }

    return points;
  }
}
