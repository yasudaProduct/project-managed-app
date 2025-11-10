import { injectable } from "inversify";
import prisma from "@/lib/prisma/prisma";
import { IWbsQueryRepository, WbsTaskData, PhaseData } from "@/applications/wbs/query/wbs-query-repository";

@injectable()
export class WbsQueryRepository implements IWbsQueryRepository {
  async getWbsTasks(wbsId: number): Promise<WbsTaskData[]> {
    // WorkRecordを集計して実績工数、実績開始日、実績終了日を算出するサブクエリ
    // WbsTaskと結合し、最終的なWbsTaskDataの形式でデータを取得する
    const tasks = await prisma.$queryRaw<WbsTaskData[]>`
      SELECT
        t.id,
        t.name,
        COALESCE(tk_kijun."kijunKosu", 0) AS "kijunKosu",
        COALESCE(tk_yotei."yoteiKosu", 0) AS "yoteiKosu",
        wr."jissekiKosu" AS "jissekiKosu",
        tp_kijun."startDate" AS "kijunStart",
        tp_kijun."endDate" AS "kijunEnd",
        tp_yotei."startDate" AS "yoteiStart",
        tp_yotei."endDate" AS "yoteiEnd",
        wr."jissekiStart" AS "jissekiStart",
        wr."jissekiEnd" AS "jissekiEnd",
        t."progressRate" AS "progressRate",
        t."status" AS "status",
        CASE
          WHEN p.id IS NOT NULL THEN JSON_BUILD_OBJECT('id', p.id, 'name', p.name)
          ELSE NULL
        END AS phase,
        CASE
          WHEN u.id IS NOT NULL THEN JSON_BUILD_OBJECT('id', u.id, 'displayName', u."displayName")
          ELSE NULL
        END AS assignee
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
      LEFT JOIN LATERAL -- タスクごとの最新KIJUN期間だけを1行に絞る
        (
          SELECT tp.id, tp."startDate", tp."endDate"
          FROM "task_period" tp
          WHERE tp."taskId" = t.id AND tp.type = 'KIJUN'
          ORDER BY tp."updatedAt" DESC, tp.id DESC
          LIMIT 1
        ) AS tp_kijun ON TRUE
      LEFT JOIN LATERAL -- KIJUN期間に紐づくNORMAL工数の最新1行のみを取得
        (
          SELECT tk.kosu AS "kijunKosu"
          FROM "task_kosu" tk
          WHERE tk."periodId" = tp_kijun.id
            AND tk.type = 'NORMAL'
            AND tk."wbsId" = t."wbsId"
          ORDER BY tk."updatedAt" DESC, tk.id DESC
          LIMIT 1
        ) AS tk_kijun ON TRUE
      LEFT JOIN LATERAL -- タスクごとの最新YOTEI期間だけを1行に絞る
        (
          SELECT tp.id, tp."startDate", tp."endDate"
          FROM "task_period" tp
          WHERE tp."taskId" = t.id AND tp.type = 'YOTEI'
          ORDER BY tp."updatedAt" DESC, tp.id DESC
          LIMIT 1
        ) AS tp_yotei ON TRUE
      LEFT JOIN LATERAL -- YOTEI期間に紐づくNORMAL工数の最新1行のみを取得
        (
          SELECT tk.kosu AS "yoteiKosu"
          FROM "task_kosu" tk
          WHERE tk."periodId" = tp_yotei.id
            AND tk.type = 'NORMAL'
            AND tk."wbsId" = t."wbsId"
          ORDER BY tk."updatedAt" DESC, tk.id DESC
          LIMIT 1
        ) AS tk_yotei ON TRUE
      WHERE
        t."wbsId" = ${Number(wbsId)}
      ORDER BY
        p."seq" ASC,
        t."taskNo" ASC;
    `;

    // INFO:TaskとTaskPeriodが1対多関係にあるため、TaskPeriodの最新のものを取得するためにLATERALを使用している
    // TaskPeriodが複数紐づく必要が無ければテーブル構造を見直す

    return tasks.map(task => ({
      ...task,
      kijunKosu: task.kijunKosu ? Number(task.kijunKosu) : null,
      yoteiKosu: task.yoteiKosu ? Number(task.yoteiKosu) : null,
      jissekiKosu: task.jissekiKosu ? Number(task.jissekiKosu) : null,
      progressRate: task.progressRate ? Number(task.progressRate) : null,
    }))
  }

  async getPhases(wbsId: number): Promise<PhaseData[]> {
    const phases = await prisma.wbsPhase.findMany({
      where: {
        wbsId: wbsId,
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