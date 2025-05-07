import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

// テスト用の環境変数を読み込む
dotenv.config({ path: path.resolve(__dirname, '.env.test') });

// グローバル変数としてprismaクライアントを定義
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient;
}

// シングルトンパターンでPrismaClientを保持
let prismaInstance: PrismaClient | undefined;

/**
 * プロセス終了時にDBをクリーンアップする関数
 */
const cleanupDatabase = async () => {
  try {
    console.log('テストデータベースをクリーンアップしています...');
    if (!global.prisma) {
      console.warn('クリーンアップのためのPrismaクライアントが初期化されていません');
      return;
    }
    
    // カスケード削除で関連テーブルも一緒にクリーンアップ
    await global.prisma.$executeRaw`TRUNCATE TABLE "Projects" CASCADE`;
    await global.prisma.$executeRaw`TRUNCATE TABLE "WbsTask" CASCADE`;
    await global.prisma.$executeRaw`TRUNCATE TABLE "TaskPeriod" CASCADE`;
    await global.prisma.$executeRaw`TRUNCATE TABLE "TaskKosu" CASCADE`;
    await global.prisma.$executeRaw`TRUNCATE TABLE "WbsPhase" CASCADE`;
    console.log('テストデータベースのクリーンアップが完了しました');
  } catch (error) {
    console.error('テストデータベースのクリーンアップに失敗しました:', error);
  }
};

/**
 * グローバルセットアップ関数
 * Jestのglobalセットアップとして実行される
 */
const setup = async () => {
  console.log('結合テスト環境をセットアップしています');
  console.log(`実行モード: ${process.env.NODE_ENV || 'not set'}`);

  try {
    // テスト用のデータベースが設定されているか確認
    if (!process.env.DATABASE_URL) {
      throw new Error('テスト用のDATABASE_URLが設定されていません');
    }
    
    console.log(`データベース接続: ${process.env.DATABASE_URL}`);

    // PrismaClientのインスタンス作成（シングルトンパターン）
    if (!global.prisma) {
      console.log('新しいPrismaClientインスタンスを作成しています');
      prismaInstance = new PrismaClient({
        log: process.env.DEBUG === 'true' ? ['query', 'info', 'warn', 'error'] : ['error'],
      });
      global.prisma = prismaInstance;
    } else {
      console.log('既存のPrismaClientインスタンスを再利用します');
    }

    // データベース接続テスト
    await global.prisma.$connect();
    console.log('テストデータベースに接続しました');

    console.log('テスト環境のセットアップが完了しました');
  } catch (error) {
    console.error('テスト環境のセットアップに失敗しました:', error);
    throw error;
  }
};

/**
 * グローバルティアダウン関数
 * Jestのglobalティアダウンとして実行される
 */
const teardown = async () => {
  console.log('テスト環境のティアダウンを開始します');

  try {
    // データベースのクリーンアップ
    await cleanupDatabase();

    // Prismaクライアントの切断
    if (global.prisma) {
      await global.prisma.$disconnect();
      console.log('テストデータベースから切断しました');
    }
    
    console.log('テスト環境のティアダウンが完了しました');
  } catch (error) {
    console.error('テスト環境のティアダウンに失敗しました:', error);
  }
};

// ファイルが直接実行された場合のためのエントリーポイント
if (require.main === module) {
  setup().catch(console.error);
}

// デフォルトエクスポートはグローバルセットアップとして使用
export default setup;

// ティアダウン関数もエクスポート
export { teardown as globalTeardown };