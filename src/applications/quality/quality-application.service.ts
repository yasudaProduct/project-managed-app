import { injectable, inject } from 'inversify';
import { SYMBOL } from '@/types/symbol';
import type { IQualityReviewTargetRepository, IQualityReviewerRepository } from './i-quality-review-target.repository';
import type { IQualitySizeMetricRepository, IQualityFindingRepository, IQualityMetricsReadRepository } from './i-quality-metrics.repository';
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
  listSizeMetrics(targetId: number): Promise<QualitySizeMetric[]>;
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
      });
    }
    return items;
  }

  async listFindings(targetId: number): Promise<QualityFinding[]> {
    return this.findingRepo.findByTarget(targetId);
  }

  async listSizeMetrics(targetId: number): Promise<QualitySizeMetric[]> {
    return this.sizeRepo.findByTarget(targetId);
  }
}
