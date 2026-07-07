/**
 * EVMバッファ金額換算方式
 * 金額モードのBAC計算でバッファ工数（時間）をどう金額換算するかを定義
 */

/**
 * Prisma の EvmBufferCostMethod enum と値を一致させた独立 union 型。
 * Prisma enum との相互変換は Infrastructure 層でのみ行う。
 */
export type EvmBufferCostMethod = 'AVERAGE_RATE' | 'DEFAULT_RATE' | 'EXCLUDE';

export const EVM_BUFFER_COST_METHODS: EvmBufferCostMethod[] = [
  'AVERAGE_RATE',
  'DEFAULT_RATE',
  'EXCLUDE',
];

/**
 * バッファ金額換算方式のラベル
 */
export const EVM_BUFFER_COST_METHOD_LABELS: Record<EvmBufferCostMethod, string> = {
  AVERAGE_RATE: 'WBS平均単価で換算',
  DEFAULT_RATE: 'デフォルト単価で換算',
  EXCLUDE: 'BACに含めない',
};

/**
 * バッファ金額換算方式の説明
 */
export const EVM_BUFFER_COST_METHOD_DESCRIPTIONS: Record<EvmBufferCostMethod, string> = {
  AVERAGE_RATE:
    'WBS担当者の単価の平均 × バッファ時間で金額換算します（担当者未登録時はデフォルト単価）。',
  DEFAULT_RATE: 'デフォルト単価（¥5,000/h） × バッファ時間で金額換算します。',
  EXCLUDE: '金額モードのBACにはバッファを含めません（工数モードでは常に加算されます）。',
};
