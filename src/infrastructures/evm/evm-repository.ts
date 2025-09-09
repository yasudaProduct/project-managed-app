import { injectable } from 'inversify';
import { geppoPrisma } from '@/lib/prisma/geppo';
import { IEvmRepository } from '../../applications/evm/ievm-repository';
import { ProjectEvm } from '../../domains/evm/project-evm';
import { EvmMetrics } from '../../domains/evm/evm-metrics';

type EvmWbsRow = {
  PROJECT_ID: string;
  PROJECT_NAME: string | null;
  PV_DATE: Date | null;
  EV_DATE: Date | null;
  AC_DATE: Date | null;
  PV_KOSU: number | null;
  EV_KOSU: number | null;
  AC_KOSU: number | null;
  KIJUN_KOSU: number | null;
};

type EvmWbsRangeRow = {
  PV_DATE: Date | null;
  EV_DATE: Date | null;
  AC_DATE: Date | null;
  PV_KOSU: number | null;
  EV_KOSU: number | null;
  AC_KOSU: number | null;
};

@injectable()
export class EvmRepository implements IEvmRepository {

  async getProjectEvmData(projectId: string): Promise<ProjectEvm | null> {
    // MySQLのwbsテーブルからEVMデータを取得
    const wbsRecords = await geppoPrisma.$queryRaw<EvmWbsRow[]>`
      SELECT 
        PROJECT_ID,
        PROJECT_NAME,
        PV_DATE,
        EV_DATE,
        AC_DATE,
        PV_KOSU,
        EV_KOSU,
        AC_KOSU,
        KIJUN_KOSU
      FROM wbs 
      WHERE PROJECT_ID = ${projectId}
        AND PV_KOSU IS NOT NULL 
        AND EV_KOSU IS NOT NULL 
        AND AC_KOSU IS NOT NULL
      ORDER BY PV_DATE ASC
    `;

    if (wbsRecords.length === 0) {
      return null;
    }

    const firstRecord = wbsRecords[0];
    const projectName = firstRecord.PROJECT_NAME || projectId;

    // バジェット総額を計算（全WBSの基準工数の合計）
    const budgetAtCompletion = await this.calculateBudgetAtCompletion(projectId);

    // メトリクスを構築
    const metricsMap = new Map<string, { pv: number; ev: number; ac: number; date: Date }>();

    wbsRecords.forEach(record => {
      const date: Date | null = record.PV_DATE ?? record.EV_DATE ?? record.AC_DATE;
      if (!date) return;
      const dateKey = date.toISOString().split('T')[0];

      const existingMetric = metricsMap.get(dateKey);
      const pv = Number(record.PV_KOSU ?? 0);
      const ev = Number(record.EV_KOSU ?? 0);
      const ac = Number(record.AC_KOSU ?? 0);

      if (existingMetric) {
        existingMetric.pv += pv;
        existingMetric.ev += ev;
        existingMetric.ac += ac;
      } else {
        metricsMap.set(dateKey, { pv, ev, ac, date });
      }
    });

    const metrics = Array.from(metricsMap.values()).map(metric =>
      EvmMetrics.create({
        pv: metric.pv,
        ev: metric.ev,
        ac: metric.ac,
        date: metric.date,
      })
    );

    return ProjectEvm.create({
      projectId,
      projectName,
      metrics,
      budgetAtCompletion,
    });
  }

  async getProjectEvmDataByDateRange(
    projectId: string,
    startDate: Date,
    endDate: Date
  ): Promise<EvmMetrics[]> {
    const wbsRecords = await geppoPrisma.$queryRaw<EvmWbsRangeRow[]>`
      SELECT 
        PV_DATE,
        EV_DATE,
        AC_DATE,
        PV_KOSU,
        EV_KOSU,
        AC_KOSU
      FROM wbs 
      WHERE PROJECT_ID = ${projectId}
        AND (
          (PV_DATE BETWEEN ${startDate} AND ${endDate}) OR
          (EV_DATE BETWEEN ${startDate} AND ${endDate}) OR
          (AC_DATE BETWEEN ${startDate} AND ${endDate})
        )
        AND PV_KOSU IS NOT NULL 
        AND EV_KOSU IS NOT NULL 
        AND AC_KOSU IS NOT NULL
      ORDER BY COALESCE(PV_DATE, EV_DATE, AC_DATE) ASC
    `;

    const metricsMap = new Map<string, { pv: number; ev: number; ac: number; date: Date }>();

    wbsRecords.forEach(record => {
      const date: Date | null = record.PV_DATE ?? record.EV_DATE ?? record.AC_DATE;
      if (!date) return;
      const dateKey = date.toISOString().split('T')[0];

      const existingMetric = metricsMap.get(dateKey);
      const pv = Number(record.PV_KOSU ?? 0);
      const ev = Number(record.EV_KOSU ?? 0);
      const ac = Number(record.AC_KOSU ?? 0);

      if (existingMetric) {
        existingMetric.pv += pv;
        existingMetric.ev += ev;
        existingMetric.ac += ac;
      } else {
        metricsMap.set(dateKey, { pv, ev, ac, date });
      }
    });

    return Array.from(metricsMap.values()).map(metric =>
      EvmMetrics.create({
        pv: metric.pv,
        ev: metric.ev,
        ac: metric.ac,
        date: metric.date,
      })
    );
  }

  async getAllProjectsEvmSummary(): Promise<ProjectEvm[]> {
    // すべてのプロジェクトのEVMデータを取得
    const projectIds = await geppoPrisma.$queryRaw<{ PROJECT_ID: string }[]>`
      SELECT DISTINCT PROJECT_ID 
      FROM wbs 
      WHERE PV_KOSU IS NOT NULL 
        AND EV_KOSU IS NOT NULL 
        AND AC_KOSU IS NOT NULL
    `;

    const projects: ProjectEvm[] = [];

    for (const { PROJECT_ID } of projectIds) {
      const projectEvm = await this.getProjectEvmData(PROJECT_ID);
      if (projectEvm) {
        projects.push(projectEvm);
      }
    }

    return projects;
  }

  private async calculateBudgetAtCompletion(projectId: string): Promise<number> {
    const result = await geppoPrisma.$queryRaw<{ total: number }[]>`
      SELECT COALESCE(SUM(KIJUN_KOSU), 0) as total
      FROM wbs 
      WHERE PROJECT_ID = ${projectId}
        AND KIJUN_KOSU IS NOT NULL
    `;

    return result[0]?.total || 0;
  }
}