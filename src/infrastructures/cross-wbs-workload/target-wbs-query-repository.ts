import { injectable, inject } from "inversify";
import type { PrismaClient } from "@prisma/client";
import { SYMBOL } from "@/types/symbol";
import type {
  ITargetWbsQueryRepository,
  TargetWbsInfo,
} from "@/applications/cross-wbs-workload/itarget-wbs-query-repository";

/**
 * 横断負荷計算の対象WBSクエリリポジトリ
 * @description
 * 未開始(INACTIVE)・進行中(ACTIVE)プロジェクトの最新WBSをプロジェクトごとに1件返す。
 * 画面操作上は1プロジェクト1WBSだが、テーブル構造上は複数作成できるため
 * 最新(createdAt desc, id desc)の1件を対象とする。
 */
@injectable()
export class TargetWbsQueryRepository implements ITargetWbsQueryRepository {
  constructor(
    @inject(SYMBOL.PrismaClient) private readonly prisma: PrismaClient
  ) {}

  async findTargetWbs(): Promise<TargetWbsInfo[]> {
    const projects = await this.prisma.projects.findMany({
      where: { status: { in: ["INACTIVE", "ACTIVE"] } },
      select: {
        id: true,
        name: true,
        wbs: {
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: 1,
          select: { id: true, name: true },
        },
      },
    });

    return projects
      .filter((project) => project.wbs.length > 0)
      .map((project) => ({
        wbsId: project.wbs[0].id,
        wbsName: project.wbs[0].name,
        projectId: project.id,
        projectName: project.name,
      }));
  }
}
