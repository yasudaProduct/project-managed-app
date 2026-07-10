/**
 * EVM PV按分方式
 * LINEAR按分（期間中のPV算出）を暦日ベースにするか営業日ベースにするかを定義
 */

/**
 * Prisma の EvmPvDistribution enum と値を一致させた独立 union 型。
 * Prisma enum との相互変換は Infrastructure 層でのみ行う。
 */
export type EvmPvDistribution = 'CALENDAR' | 'BUSINESS_DAYS';

export const EVM_PV_DISTRIBUTIONS: EvmPvDistribution[] = ['CALENDAR', 'BUSINESS_DAYS'];

/**
 * PV按分方式のラベル
 */
export const EVM_PV_DISTRIBUTION_LABELS: Record<EvmPvDistribution, string> = {
  CALENDAR: '暦日按分',
  BUSINESS_DAYS: '営業日按分',
};

/**
 * PV按分方式の説明
 */
export const EVM_PV_DISTRIBUTION_DESCRIPTIONS: Record<EvmPvDistribution, string> = {
  CALENDAR: '土日・祝日を含む暦日で計画価値を按分します（従来動作）。',
  BUSINESS_DAYS:
    '土日・日本の祝日・会社休日を除いた営業日で計画価値を按分します。週末を挟む期間のPVカーブが実態に近づきます。',
};
