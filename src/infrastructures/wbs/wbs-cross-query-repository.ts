import { IWbsCrossQueryRepository, PhaseHoursSummary } from "@/applications/wbs/iwbs-cross-query-repository";
import prisma from "@/lib/prisma/prisma";
import { injectable } from "inversify";
import { Prisma } from "@prisma/client";

@injectable()
export class WbsCrossQueryRepository implements IWbsCrossQueryRepository {

    async getPhaseHoursSummary(wbsIds?: number[]): Promise<PhaseHoursSummary[]> {
        const wbsFilter = wbsIds
            ? Prisma.sql`AND wp."wbsId" = ANY(${wbsIds}::int[])`
            : Prisma.empty;

        const rows = await prisma.$queryRaw<Array<{
            template_id: number | null;
            phase_name: string;
            phase_code: string;
            total_planned_hours: Prisma.Decimal | null;
            total_actual_hours: Prisma.Decimal | null;
            wbs_count: bigint;
        }>>`
            SELECT
                wp."templateId" AS template_id,
                COALESCE(pt.name, wp.name) AS phase_name,
                COALESCE(pt.code, wp.code) AS phase_code,
                SUM(COALESCE(yotei_kosu.kosu, 0)) AS total_planned_hours,
                SUM(COALESCE(wr_agg.hours_worked, 0)) AS total_actual_hours,
                COUNT(DISTINCT wp."wbsId") AS wbs_count
            FROM wbs_phase wp
            LEFT JOIN phase_template pt ON pt.id = wp."templateId"
            JOIN wbs_task wt ON wt."phaseId" = wp.id
            LEFT JOIN LATERAL (
                SELECT SUM(tk.kosu) AS kosu
                FROM task_period tp
                JOIN task_kosu tk ON tk."periodId" = tp.id AND tk.type = 'NORMAL'
                WHERE tp."taskId" = wt.id AND tp.type = 'YOTEI'
            ) yotei_kosu ON true
            LEFT JOIN LATERAL (
                SELECT SUM(wr.hours_worked) AS hours_worked
                FROM work_records wr
                WHERE wr."taskId" = wt.id
            ) wr_agg ON true
            WHERE 1=1 ${wbsFilter}
            GROUP BY wp."templateId", phase_name, phase_code
            ORDER BY MIN(wp.seq)
        `;

        return rows.map(row => ({
            templateId: row.template_id,
            phaseName: row.phase_name,
            phaseCode: row.phase_code,
            totalPlannedHours: Number(row.total_planned_hours ?? 0),
            totalActualHours: Number(row.total_actual_hours ?? 0),
            wbsCount: Number(row.wbs_count),
        }));
    }
}
