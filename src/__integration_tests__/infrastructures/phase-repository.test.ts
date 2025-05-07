// filepath: /Users/yuta/Develop/project-managed-app/src/__integration_tests__/infrastructures/phase-repository.test.ts
import { PhaseRepository } from '@/infrastructures/phase-repository';
import { cleanupTestData, seedTestProject, testIds } from '../helpers';

describe('PhaseRepository Integration Tests', () => {
  let phaseRepository: PhaseRepository;

  beforeAll(async () => {
    // リポジトリインスタンスの作成
    phaseRepository = new PhaseRepository();

    // テストデータの準備（プロジェクト、WBS、フェーズを作成）
    await seedTestProject(global.prisma);
  });

  afterAll(async () => {
    // テストデータのクリーンアップ
    await cleanupTestData(global.prisma);
  });

  describe('フェーズのCRUD操作', () => {
    it('IDによるフェーズの取得', async () => {
      // 事前準備したフェーズをIDで取得
      const phase = await phaseRepository.findById(testIds.phaseId);

      // 取得したフェーズを検証
      expect(phase).not.toBeNull();
      expect(phase?.id).toBe(testIds.phaseId);
      expect(phase?.name).toBe('テストフェーズ');
      expect(phase?.code.value()).toBe('TEST');
      expect(phase?.seq).toBe(1);
    });

    it('すべてのフェーズの取得', async () => {
      // // 追加のテストフェーズを作成
      // const additionalPhase = await global.prisma.wbsPhase.create({
      //   data: {
      //     name: '開発フェーズ',
      //     code: 'DEV',
      //     seq: 2,
      //     wbsId: testIds.wbsId,
      //   }
      // });

      // // WBSに紐づくすべてのフェーズを取得
      // const phases = await phaseRepository.findAll(testIds.wbsId);

      // // 少なくとも2つのフェーズ（初期 + 追加）があることを確認
      // expect(phases.length).toBeGreaterThanOrEqual(2);

      // // 取得したフェーズを検証
      // const testPhase = phases.find(p => p.id === testIds.phaseId);
      // expect(testPhase).toBeTruthy();
      // expect(testPhase?.name).toBe('テストフェーズ');

      // const devPhase = phases.find(p => p.id === additionalPhase.id);
      // expect(devPhase).toBeTruthy();
      // expect(devPhase?.name).toBe('開発フェーズ');
      // expect(devPhase?.code.value()).toBe('DEV');

      // // テスト後のクリーンアップ
      // await global.prisma.wbsPhase.delete({ where: { id: additionalPhase.id } });
    });
  });

  describe('エラーケース', () => {
    it('存在しないIDを指定した場合はnullを返すこと', async () => {
      const nonExistingPhase = await phaseRepository.findById(9999);
      expect(nonExistingPhase).toBeNull();
    });

    it('存在しないWBSを指定した場合は空の配列を返すこと', async () => {
      // const phases = await phaseRepository.findAll(9999);
      // expect(phases).toEqual([]);
    });
  });
});