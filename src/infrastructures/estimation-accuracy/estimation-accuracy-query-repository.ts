import type { PrismaClient } from "@prisma/client";
import { inject, injectable } from "inversify";
import { SYMBOL } from "@/types/symbol";
import type {
  IEstimationAccuracyQueryRepository,
  CompletedTaskEstimate,
} from "@/applications/estimation-accuracy/iestimation-accuracy-query-repository";

type PeriodWithKosus = {
  type: string;
  kosus: { type: string; kosu: unknown }[];
};

function sumNormalKosu(period?: PeriodWithKosus): number | null {
  if (!period) return null;
  return period.kosus
    .filter((kosu) => kosu.type === "NORMAL")
    .reduce((sum, kosu) => sum + Number(kosu.kosu), 0);
}

@injectable()
export class EstimationAccuracyQueryRepository implements IEstimationAccuracyQueryRepository {
  constructor(
    @inject(SYMBOL.PrismaClient) private readonly prisma: PrismaClient
  ) {}

  async listCompletedTaskEstimates(): Promise<CompletedTaskEstimate[]> {
    // 振り返りが目的のため、完了済みプロジェクトも対象にする（中止のみ除く）。
    // 常設プロジェクト（定常・不定期作業の受け皿）は見積精度の対象外。
    const projects = await this.prisma.projects.findMany({
      where: { status: { not: "CANCELLED" }, kind: "PROJECT" },
      orderBy: { startDate: "asc" },
      select: {
        id: true,
        name: true,
        wbs: {
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: 1,
          select: { id: true },
        },
      },
    });
    const projectByWbsId = new Map<number, { id: string; name: string }>();
    for (const project of projects) {
      if (project.wbs.length > 0) {
        projectByWbsId.set(project.wbs[0].id, { id: project.id, name: project.name });
      }
    }
    const wbsIds = [...projectByWbsId.keys()];
    if (wbsIds.length === 0) return [];

    const tasks = await this.prisma.wbsTask.findMany({
      where: { wbsId: { in: wbsIds }, status: "COMPLETED", isDeleted: false },
      orderBy: [{ wbsId: "asc" }, { phase: { seq: "asc" } }, { taskNo: "asc" }],
      include: {
        phase: { include: { template: true } },
        periods: { include: { kosus: true } },
      },
    });
    const actuals = await this.prisma.workRecord.groupBy({
      by: ["taskId"],
      where: { taskId: { in: tasks.map((task) => task.id) } },
      _sum: { hours_worked: true },
    });
    const actualByTaskId = new Map(
      actuals.map((row) => [row.taskId, Number(row._sum.hours_worked ?? 0)])
    );

    return tasks.map((task) => {
      const project = projectByWbsId.get(task.wbsId)!;
      const kijun = task.periods.find((period) => period.type === "KIJUN");
      const yotei = task.periods.find((period) => period.type === "YOTEI");
      return {
        projectId: project.id,
        projectName: project.name,
        phaseId: task.phase?.id ?? null,
        phaseName: task.phase?.name ?? null,
        phaseTemplateId: task.phase?.template?.id ?? null,
        phaseTemplateName: task.phase?.template?.name ?? null,
        baselineHours: sumNormalKosu(kijun) ?? sumNormalKosu(yotei) ?? 0,
        actualHours: actualByTaskId.get(task.id) ?? 0,
      };
    });
  }
}
