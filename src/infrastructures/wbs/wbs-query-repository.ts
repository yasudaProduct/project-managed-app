import { injectable } from "inversify";
import prisma from "@/lib/prisma";
import { IWbsQueryRepository, WbsTaskData, PhaseData } from "@/applications/wbs/query/wbs-query-repository";

@injectable()
export class WbsQueryRepository implements IWbsQueryRepository {
  async getWbsTasks(projectId: string, wbsId: string): Promise<WbsTaskData[]> {
    // WorkRecordを集計して実績工数、実績開始日、実績終了日を算出するサブクエリ
    // WbsTaskと結合し、最終的なWbsTaskDataの形式でデータを取得する
    const tasks = await prisma.$queryRaw<WbsTaskData[]>`
      SELECT
        t.id,
        t.name,
        tk.kosu AS "yoteiKosu",
        wr."jissekiKosu" AS "jissekiKosu",
        tp."startDate" AS "yoteiStart",
        tp."endDate" AS "yoteiEnd",
        wr."jissekiStart" AS "jissekiStart",
        wr."jissekiEnd" AS "jissekiEnd",
        JSON_BUILD_OBJECT('id', p.id, 'name', p.name) AS phase,
        JSON_BUILD_OBJECT('id', u.id, 'displayName', u."displayName") AS assignee
      FROM
        "wbs_task" AS t
      LEFT JOIN
        (
          SELECT
            "taskId",
            SUM(hours_worked) AS "jissekiKosu",
            MIN(date) AS "jissekiStart",
            MAX(date) AS "jissekiEnd"
          FROM
            "work_records"
          GROUP BY
            "taskId"
        ) AS wr ON t.id = wr."taskId"
      LEFT JOIN
        "wbs_phase" AS p ON t."phaseId" = p.id
      LEFT JOIN
        "wbs_assignee" AS wa ON t."assigneeId" = wa.id
      LEFT JOIN
        "users" AS u ON wa."assigneeId" = u.id
      LEFT JOIN
        "task_period" AS tp ON t.id = tp."taskId" AND tp.type = 'YOTEI'
      LEFT JOIN
        "task_kosu" AS tk ON tp.id = tk."periodId" AND tk.type = 'NORMAL'
      WHERE
        t."wbsId" = ${Number(wbsId)}
      ORDER BY
        p."seq" ASC,
        t."taskNo" ASC;
    `;

    return tasks.map(task => ({
      ...task,
      yoteiKosu: task.yoteiKosu ? Number(task.yoteiKosu) : null,
      jissekiKosu: task.jissekiKosu ? Number(task.jissekiKosu) : null,
    }))
  }

  async getPhases(wbsId: string): Promise<PhaseData[]> {
    const phases = await prisma.wbsPhase.findMany({
      where: {
        wbsId: Number(wbsId),
      },
      orderBy: {
        seq: "asc",
      },
      select: {
        id: true,
        name: true,
        seq: true,
      },
    });

    return phases;
  }
}