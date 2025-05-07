// filepath: /Users/yuta/Develop/project-managed-app/src/__integration_tests__/load-env.ts
import dotenv from 'dotenv';
import path from 'path';

// テスト用の環境変数を明示的に読み込む
console.log('Loading test environment variables...');
const envPath = path.resolve(__dirname, '.env.test');
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.warn(`Warning: Could not load .env.test file from ${envPath}. Error: ${result.error.message}`);
} else {
  console.log(`Test environment variables loaded from ${envPath}`);
}

// データベース接続文字列の確認
if (!process.env.DATABASE_URL) {
  console.warn('Warning: DATABASE_URL is not set');
} else {
  console.log(`Using database: ${process.env.DATABASE_URL}`);
  
  // テストデータベースを使用しているか確認
  if (!process.env.DATABASE_URL.includes('test')) {
    console.warn('Warning: DATABASE_URL does not contain "test". Make sure you\'re using a test database!');
  }
}