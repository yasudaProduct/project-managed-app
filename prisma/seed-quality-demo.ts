/**
 * 定量品質管理の指標データ駆動化リファクタリングを確認するためのデモデータ投入スクリプト
 *
 * 確認ポイント:
 * 1. unit=PAGE選択 → レビュー密度・指摘密度・レビュー実施率が表示
 * 2. unit=LINES_OF_CODE選択 → レビュー密度・指摘密度がKLOC単位で表示
 * 3. unit=TEST_CASE選択 → バグ密度・テスト密度が表示、レビュー実施率は非表示
 * 4. 指摘一覧にソース列（レビュー/テスト）が表示
 * 5. 指摘登録時にsource選択可能
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const wbsId = 1;

  // --- 1. 評価対象を有効化（既存の3つ）+ 追加 ---
  // 既存ターゲットを有効化
  await prisma.qualityReviewTarget.updateMany({
    where: { wbsId, id: { in: [1, 2, 3] } },
    data: { isActive: true },
  });
  console.log('既存ターゲット(id=1,2,3)を有効化');

  // 追加の評価対象（製造B、単体テストB）
  const targetB_code = await prisma.qualityReviewTarget.upsert({
    where: { wbsId_taskNo: { wbsId, taskNo: 'D3-0002' } },
    create: {
      wbsId,
      taskNo: 'D3-0002',
      name: '製造_機能B',
      documentType: 'CODE',
      reviewType: 'PEER',
      isActive: true,
    },
    update: { isActive: true, name: '製造_機能B', documentType: 'CODE' },
  });
  console.log(`製造_機能B target id=${targetB_code.id}`);

  const targetB_test = await prisma.qualityReviewTarget.upsert({
    where: { wbsId_taskNo: { wbsId, taskNo: 'D4-0002' } },
    create: {
      wbsId,
      taskNo: 'D4-0002',
      name: '単体テスト_機能B',
      documentType: 'TEST',
      reviewType: 'PEER',
      isActive: true,
    },
    update: { isActive: true, name: '単体テスト_機能B', documentType: 'TEST' },
  });
  console.log(`単体テスト_機能B target id=${targetB_test.id}`);

  // --- 2. 規模データ ---
  // target 1 (詳細設計_機能A): PAGE=42（既存）
  // target 2 (製造_機能A): LOC=3200（既存）、TEST_CASE追加、PAGE追加
  await prisma.qualitySizeMetric.upsert({
    where: { targetId_unit: { targetId: 2, unit: 'TEST_CASE' } },
    create: { targetId: 2, unit: 'TEST_CASE', value: 85, measuredAt: new Date('2026-02-15'), note: '製造_機能A（テストケース数）' },
    update: { value: 85 },
  });
  await prisma.qualitySizeMetric.upsert({
    where: { targetId_unit: { targetId: 2, unit: 'PAGE' } },
    create: { targetId: 2, unit: 'PAGE', value: 28, measuredAt: new Date('2026-02-01'), note: '製造_機能A（設計書ページ数）' },
    update: { value: 28 },
  });

  // target 3 (単体テスト_機能A): TEST_CASE=48（既存）、LOC追加
  await prisma.qualitySizeMetric.upsert({
    where: { targetId_unit: { targetId: 3, unit: 'LINES_OF_CODE' } },
    create: { targetId: 3, unit: 'LINES_OF_CODE', value: 3200, measuredAt: new Date('2026-02-20'), note: '単体テスト_機能A（テスト対象LOC）' },
    update: { value: 3200 },
  });

  // targetB_code (製造_機能B): LOC + PAGE
  await prisma.qualitySizeMetric.upsert({
    where: { targetId_unit: { targetId: targetB_code.id, unit: 'LINES_OF_CODE' } },
    create: { targetId: targetB_code.id, unit: 'LINES_OF_CODE', value: 4500, measuredAt: new Date('2026-02-10'), note: '製造_機能B（LOC）' },
    update: { value: 4500 },
  });
  await prisma.qualitySizeMetric.upsert({
    where: { targetId_unit: { targetId: targetB_code.id, unit: 'PAGE' } },
    create: { targetId: targetB_code.id, unit: 'PAGE', value: 35, measuredAt: new Date('2026-02-10'), note: '製造_機能B（設計書ページ数）' },
    update: { value: 35 },
  });

  // targetB_test (単体テスト_機能B): TEST_CASE + LOC
  await prisma.qualitySizeMetric.upsert({
    where: { targetId_unit: { targetId: targetB_test.id, unit: 'TEST_CASE' } },
    create: { targetId: targetB_test.id, unit: 'TEST_CASE', value: 120, measuredAt: new Date('2026-03-01'), note: '単体テスト_機能B（テストケース数）' },
    update: { value: 120 },
  });
  await prisma.qualitySizeMetric.upsert({
    where: { targetId_unit: { targetId: targetB_test.id, unit: 'LINES_OF_CODE' } },
    create: { targetId: targetB_test.id, unit: 'LINES_OF_CODE', value: 4500, measuredAt: new Date('2026-03-01'), note: '単体テスト_機能B（テスト対象LOC）' },
    update: { value: 4500 },
  });

  console.log('規模データ投入完了');

  // --- 3. レビュー指摘 (source=REVIEW) ---
  // target 1 (詳細設計_機能A) — 既存3件あり。追加で2件
  const reviewFindings1 = [
    { targetId: 1, severity: 'MINOR' as const, source: 'REVIEW' as const, category: '整合性', description: 'ER図とテーブル定義書の不一致', foundAt: new Date('2026-01-11') },
    { targetId: 1, severity: 'MAJOR' as const, source: 'REVIEW' as const, category: '要件', description: 'セキュリティ要件の考慮漏れ', foundAt: new Date('2026-01-12') },
  ];

  // target 2 (製造_機能A) — レビュー指摘
  const reviewFindings2 = [
    { targetId: 2, severity: 'MAJOR' as const, source: 'REVIEW' as const, category: 'ロジック', description: 'NULL安全性の不備', foundAt: new Date('2026-02-05') },
    { targetId: 2, severity: 'MINOR' as const, source: 'REVIEW' as const, category: '命名', description: '変数名が仕様と不一致', foundAt: new Date('2026-02-06') },
    { targetId: 2, severity: 'MINOR' as const, source: 'REVIEW' as const, category: '可読性', description: 'ネストが深すぎる箇所あり', foundAt: new Date('2026-02-07') },
    { targetId: 2, severity: 'INFO' as const, source: 'REVIEW' as const, category: '体裁', description: 'コメントの誤字', foundAt: new Date('2026-02-07') },
  ];

  // targetB_code (製造_機能B) — レビュー指摘
  const reviewFindingsB = [
    { targetId: targetB_code.id, severity: 'MAJOR' as const, source: 'REVIEW' as const, category: 'ロジック', description: '排他制御の欠如', foundAt: new Date('2026-02-12') },
    { targetId: targetB_code.id, severity: 'MAJOR' as const, source: 'REVIEW' as const, category: 'ロジック', description: 'エラーハンドリング不足', foundAt: new Date('2026-02-13') },
    { targetId: targetB_code.id, severity: 'MINOR' as const, source: 'REVIEW' as const, category: '性能', description: 'N+1クエリの可能性', foundAt: new Date('2026-02-14') },
    { targetId: targetB_code.id, severity: 'MINOR' as const, source: 'REVIEW' as const, category: '命名', description: 'メソッド名が動詞で始まっていない', foundAt: new Date('2026-02-15') },
    { targetId: targetB_code.id, severity: 'INFO' as const, source: 'REVIEW' as const, category: '体裁', description: 'インデント不統一', foundAt: new Date('2026-02-15') },
  ];

  // --- 4. テストバグ (source=TEST) ---
  // target 3 (単体テスト_機能A)
  const testFindings3 = [
    { targetId: 3, severity: 'MAJOR' as const, source: 'TEST' as const, category: '機能', description: '境界値エラー: 最大値+1で例外未発生', foundAt: new Date('2026-02-22') },
    { targetId: 3, severity: 'MAJOR' as const, source: 'TEST' as const, category: '機能', description: 'NULLパラメータでクラッシュ', foundAt: new Date('2026-02-23') },
    { targetId: 3, severity: 'MINOR' as const, source: 'TEST' as const, category: 'UI', description: 'エラーメッセージが英語のまま', foundAt: new Date('2026-02-24') },
    { targetId: 3, severity: 'MINOR' as const, source: 'TEST' as const, category: '性能', description: '大量データ時のレスポンス遅延', foundAt: new Date('2026-02-25') },
    { targetId: 3, severity: 'INFO' as const, source: 'TEST' as const, category: 'ログ', description: 'デバッグログが本番コードに残存', foundAt: new Date('2026-02-25') },
  ];

  // targetB_test (単体テスト_機能B)
  const testFindingsB = [
    { targetId: targetB_test.id, severity: 'MAJOR' as const, source: 'TEST' as const, category: '機能', description: 'データ更新時の整合性チェック漏れ', foundAt: new Date('2026-03-03') },
    { targetId: targetB_test.id, severity: 'MAJOR' as const, source: 'TEST' as const, category: '機能', description: '同時実行時のデータ競合', foundAt: new Date('2026-03-04') },
    { targetId: targetB_test.id, severity: 'MAJOR' as const, source: 'TEST' as const, category: 'セキュリティ', description: 'SQLインジェクション脆弱性', foundAt: new Date('2026-03-05') },
    { targetId: targetB_test.id, severity: 'MINOR' as const, source: 'TEST' as const, category: 'UI', description: '入力値の桁数制限が機能しない', foundAt: new Date('2026-03-05') },
    { targetId: targetB_test.id, severity: 'MINOR' as const, source: 'TEST' as const, category: '機能', description: 'ページネーションの件数表示ずれ', foundAt: new Date('2026-03-06') },
    { targetId: targetB_test.id, severity: 'MINOR' as const, source: 'TEST' as const, category: '互換性', description: 'Safari でレイアウト崩れ', foundAt: new Date('2026-03-07') },
    { targetId: targetB_test.id, severity: 'INFO' as const, source: 'TEST' as const, category: 'ログ', description: '警告ログの出力レベル不適切', foundAt: new Date('2026-03-07') },
  ];

  // 混合: テストターゲットにもレビュー指摘を少し混ぜる（区別確認用）
  const reviewFindingsOnTest = [
    { targetId: 3, severity: 'MINOR' as const, source: 'REVIEW' as const, category: 'テスト設計', description: 'テスト観点の網羅性不足', foundAt: new Date('2026-02-21') },
    { targetId: targetB_test.id, severity: 'MINOR' as const, source: 'REVIEW' as const, category: 'テスト設計', description: '異常系テストケースの不足', foundAt: new Date('2026-03-02') },
  ];

  const allFindings = [
    ...reviewFindings1,
    ...reviewFindings2,
    ...reviewFindingsB,
    ...testFindings3,
    ...testFindingsB,
    ...reviewFindingsOnTest,
  ];

  for (const f of allFindings) {
    await prisma.qualityFinding.create({ data: f });
  }
  console.log(`指摘データ ${allFindings.length}件 投入完了`);
  console.log(`  REVIEW: ${allFindings.filter(f => f.source === 'REVIEW').length}件`);
  console.log(`  TEST:   ${allFindings.filter(f => f.source === 'TEST').length}件`);

  // --- 5. レビュアーの追加（新規ターゲット用） ---
  // targetB_code のレビュアー
  await prisma.qualityReviewer.createMany({
    data: [
      { targetId: targetB_code.id, reviewerUserId: 'dummy03', reviewTaskNo: 'D3-0002' },
    ],
    skipDuplicates: true,
  });

  // targetB_test のレビュアー
  await prisma.qualityReviewer.createMany({
    data: [
      { targetId: targetB_test.id, reviewerUserId: 'dummy04', reviewTaskNo: 'D4-0002' },
    ],
    skipDuplicates: true,
  });
  console.log('レビュアーデータ投入完了');

  // --- サマリー出力 ---
  const targetCount = await prisma.qualityReviewTarget.count({ where: { wbsId, isActive: true } });
  const findingCount = await prisma.qualityFinding.count();
  const reviewCount = await prisma.qualityFinding.count({ where: { source: 'REVIEW' } });
  const testCount = await prisma.qualityFinding.count({ where: { source: 'TEST' } });
  const sizeCount = await prisma.qualitySizeMetric.count();

  console.log('\n=== 投入結果サマリー ===');
  console.log(`有効な評価対象: ${targetCount}件`);
  console.log(`指摘合計: ${findingCount}件 (REVIEW: ${reviewCount}, TEST: ${testCount})`);
  console.log(`規模データ: ${sizeCount}件`);
  console.log('\n確認手順:');
  console.log('1. unit=PAGE選択 → レビュー密度・指摘密度(REVIEW)・レビュー実施率');
  console.log('2. unit=LINES_OF_CODE選択 → レビュー密度・指摘密度がKLOC単位');
  console.log('3. unit=TEST_CASE選択 → バグ密度(TEST)・テスト密度(TC/KLOC)、実施率なし');
  console.log('4. 指摘一覧でソース列（レビュー/テスト）確認');

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
