/**
 * 進捗率測定方式
 * EVMやスケジュール管理で使用する進捗率の計算方法を定義
 */

import type { ProgressMeasurementMethod as PrismaProgressMeasurementMethod } from '@prisma/client';

// Prismaのenumをそのまま使用
export type ProgressMeasurementMethod = PrismaProgressMeasurementMethod;

/**
 * 進捗測定方式のラベル
 */
export const PROGRESS_MEASUREMENT_METHOD_LABELS: Record<ProgressMeasurementMethod, string> = {
  ZERO_HUNDRED: '0/100法（保守的）',
  FIFTY_FIFTY: '50/50法（着手時評価）',
  SELF_REPORTED: '自己申告進捗率（詳細管理）',
};

/**
 * 進捗測定方式の説明
 */
export const PROGRESS_MEASUREMENT_METHOD_DESCRIPTIONS: Record<ProgressMeasurementMethod, string> = {
  ZERO_HUNDRED: '完了=100%、未完了=0%。確実な成果のみ評価します。EVMの保守的な進捗管理に適しています。',
  FIFTY_FIFTY: '着手=50%、完了=100%。着手時に半分の価値を認めます。EVMのバランス型進捗管理に適しています。',
  SELF_REPORTED: 'タスクの進捗率フィールド（0-100%）を使用。詳細な進捗管理が可能です。最も柔軟な方式です。',
};

/**
 * 進捗測定方式の詳細情報
 */
export const PROGRESS_MEASUREMENT_METHOD_INFO: Record<
  ProgressMeasurementMethod,
  {
    label: string;
    description: string;
    example: string;
    useCase: string;
  }
> = {
  ZERO_HUNDRED: {
    label: PROGRESS_MEASUREMENT_METHOD_LABELS.ZERO_HUNDRED,
    description: PROGRESS_MEASUREMENT_METHOD_DESCRIPTIONS.ZERO_HUNDRED,
    example: '未着手=0%, 進行中=0%, 完了=100%',
    useCase: 'リスク重視のプロジェクト、成果物ベースの評価',
  },
  FIFTY_FIFTY: {
    label: PROGRESS_MEASUREMENT_METHOD_LABELS.FIFTY_FIFTY,
    description: PROGRESS_MEASUREMENT_METHOD_DESCRIPTIONS.FIFTY_FIFTY,
    example: '未着手=0%, 進行中=50%, 完了=100%',
    useCase: '作業ベースの評価、バランス型プロジェクト管理',
  },
  SELF_REPORTED: {
    label: PROGRESS_MEASUREMENT_METHOD_LABELS.SELF_REPORTED,
    description: PROGRESS_MEASUREMENT_METHOD_DESCRIPTIONS.SELF_REPORTED,
    example: '未着手=0%, 進行中=担当者申告値, 完了=100%',
    useCase: '詳細な進捗トラッキング、アジャイル開発',
  },
};
