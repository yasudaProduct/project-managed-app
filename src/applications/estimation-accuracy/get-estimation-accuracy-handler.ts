import { injectable, inject } from "inversify";
import { SYMBOL } from "@/types/symbol";
import type { IQueryHandler } from "@/applications/shared/cqrs/base-classes";
import {
  summarizeEstimationAccuracy,
  type EstimationAccuracyRow,
} from "@/domains/estimation/estimation-accuracy";
import { GetEstimationAccuracyQuery } from "./get-estimation-accuracy-query";
import type {
  IEstimationAccuracyQueryRepository,
  CompletedTaskEstimate,
} from "./iestimation-accuracy-query-repository";

export type { EstimationAccuracyRow };

export type EstimationAccuracyResult = {
  /** 工程テンプレート別（プロジェクト横断）。テンプレート未設定の工程は工程名でまとめる */
  byPhaseTemplate: EstimationAccuracyRow[];
  /** プロジェクト × 工程別 */
  byProjectPhase: EstimationAccuracyRow[];
  total: EstimationAccuracyRow | null;
};

const UNCLASSIFIED = "未分類";

@injectable()
export class GetEstimationAccuracyHandler
  implements IQueryHandler<GetEstimationAccuracyQuery, EstimationAccuracyResult>
{
  constructor(
    @inject(SYMBOL.IEstimationAccuracyQueryRepository)
    private readonly queryRepository: IEstimationAccuracyQueryRepository
  ) {}

  async execute(query: GetEstimationAccuracyQuery): Promise<EstimationAccuracyResult> {
    void query;
    const estimates = await this.queryRepository.listCompletedTaskEstimates();
    const toItem = (estimate: CompletedTaskEstimate, groupKey: string, label: string) => ({
      groupKey,
      label,
      projectId: estimate.projectId,
      baselineHours: estimate.baselineHours,
      actualHours: estimate.actualHours,
    });

    const byPhaseTemplate = summarizeEstimationAccuracy(
      estimates.map((estimate) => {
        if (estimate.phaseTemplateId !== null) {
          return toItem(
            estimate,
            `template:${estimate.phaseTemplateId}`,
            estimate.phaseTemplateName ?? estimate.phaseName ?? UNCLASSIFIED
          );
        }
        if (estimate.phaseName !== null) {
          return toItem(estimate, `name:${estimate.phaseName}`, estimate.phaseName);
        }
        return toItem(estimate, "none", UNCLASSIFIED);
      })
    );
    const byProjectPhase = summarizeEstimationAccuracy(
      estimates.map((estimate) =>
        toItem(
          estimate,
          `${estimate.projectId}:${estimate.phaseId ?? "none"}`,
          `${estimate.projectName} / ${estimate.phaseName ?? UNCLASSIFIED}`
        )
      )
    );
    const [total] = summarizeEstimationAccuracy(
      estimates.map((estimate) => toItem(estimate, "total", "全体"))
    );

    return { byPhaseTemplate, byProjectPhase, total: total ?? null };
  }
}
