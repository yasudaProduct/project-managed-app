export enum SyncStatus {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

export type DatabaseTransaction = {
  // データベーストランザクションの抽象化
  // 実装ではPrismaTransactionまたは他のORMのトランザクション型をマップする
  [key: string]: unknown;
};