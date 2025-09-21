// filepath: /Users/yuta/Develop/project-managed-app/src/__integration_tests__/applications/project-application-service.test.ts
import { ProjectApplicationService } from '@/applications/projects/project-application-service';
import { ProjectRepository } from '@/infrastructures/project-repository';
import { cleanupTestData, testIds } from '../helpers';

describe('ProjectApplicationService Integration Tests', () => {
  let projectApplicationService: ProjectApplicationService;
  let projectRepository: ProjectRepository;
  const startDate = new Date('2025-05-01');
  const endDate = new Date('2025-12-31');

  beforeAll(() => {
    // リポジトリと実際のアプリケーションサービスを準備
    projectRepository = new ProjectRepository();
    projectApplicationService = new ProjectApplicationService(projectRepository);
  });

  afterAll(async () => {
    // テストデータのクリーンアップ
    await cleanupTestData(global.prisma);
  });

  describe('プロジェクト管理サービス', () => {
    it('プロジェクトの作成と取得', async () => {
      // プロジェクトの作成
      const projectName = `統合テスト用プロジェクト-${Date.now()}`;
      const projectDesc = '統合テストで作成されたプロジェクト';

      const createResult = await projectApplicationService.createProject({
        name: projectName,
        description: projectDesc,
        startDate,
        endDate
      });

      // 作成結果の検証
      expect(createResult.success).toBe(true);
      expect(createResult.id).toBeTruthy();

      if (createResult.id) {
        testIds.projectId = createResult.id;

        // 作成したプロジェクトをIDで取得
        const project = await projectApplicationService.getProjectById(createResult.id);

        // 取得したプロジェクトを検証
        expect(project).not.toBeNull();
        expect(project?.id).toBe(createResult.id);
        expect(project?.name).toBe(projectName);
        expect(project?.description).toBe(projectDesc);
        expect(project?.startDate).toEqual(startDate);
        expect(project?.endDate).toEqual(endDate);
      }
    });

    it('同名プロジェクトの重複チェック機能', async () => {
      // 既に作成済みのプロジェクト名で再度作成を試みる
      const existingProject = await projectApplicationService.getProjectById(testIds.projectId);
      expect(existingProject).not.toBeNull();

      if (existingProject) {
        // 同名プロジェクトの作成を試みる
        const duplicateResult = await projectApplicationService.createProject({
          name: existingProject.name,
          description: '重複するプロジェクト',
          startDate,
          endDate
        });

        // 作成が失敗し、適切なエラーが返されることを確認
        expect(duplicateResult.success).toBe(false);
        expect(duplicateResult.error).toBe('同様のプロジェクト名が存在します。');
      }
    });

    it('プロジェクト情報の更新', async () => {
      // プロジェクト情報を更新
      const updatedName = `更新されたプロジェクト-${Date.now()}`;
      const updatedDesc = '更新された説明文';
      const updateResult = await projectApplicationService.updateProject({
        id: testIds.projectId,
        name: updatedName,
        description: updatedDesc,
        startDate: new Date('2025-06-01'),
        endDate: new Date('2025-11-30')
      });

      // 更新結果の検証
      expect(updateResult.success).toBe(true);
      expect(updateResult.id).toBe(testIds.projectId);

      // 更新されたプロジェクトを取得
      const updatedProject = await projectApplicationService.getProjectById(testIds.projectId);

      // 更新内容の検証
      expect(updatedProject).not.toBeNull();
      expect(updatedProject?.name).toBe(updatedName);
      expect(updatedProject?.description).toBe(updatedDesc);
      expect(updatedProject?.startDate).toEqual(new Date('2025-06-01'));
      expect(updatedProject?.endDate).toEqual(new Date('2025-11-30'));
    });

    it('存在しないプロジェクトの更新失敗', async () => {
      // 存在しないIDでプロジェクト更新を試みる
      const updateResult = await projectApplicationService.updateProject({
        id: 'non-existing-id',
        name: '存在しないプロジェクト'
      });

      // 更新が失敗し、適切なエラーが返されることを確認
      expect(updateResult.success).toBe(false);
      expect(updateResult.error).toBe('プロジェクトが存在しません。');
    });

    it('すべてのプロジェクトを取得', async () => {
      // すべてのプロジェクトを取得
      const projects = await projectApplicationService.getProjectAll();

      // テストで作成したプロジェクトが含まれていることを確認
      expect(projects?.length).toBeGreaterThanOrEqual(1);
      const testProject = projects?.find(p => p.id === testIds.projectId);
      expect(testProject).toBeTruthy();
    });

    it('プロジェクトの削除', async () => {
      // プロジェクトを削除
      const deleteResult = await projectApplicationService.deleteProject(testIds.projectId);

      // 削除結果の検証
      expect(deleteResult.success).toBe(true);
      expect(deleteResult.id).toBe(testIds.projectId);

      // 削除されたことを確認
      const deletedProject = await projectApplicationService.getProjectById(testIds.projectId);
      expect(deletedProject).toBeNull();

      // クリーンアップエラー防止
      testIds.projectId = '';
    });

    it('存在しないプロジェクトの削除失敗', async () => {
      // 存在しないIDでプロジェクト削除を試みる
      const deleteResult = await projectApplicationService.deleteProject('non-existing-id');

      // 削除が失敗し、適切なエラーが返されることを確認
      expect(deleteResult.success).toBe(false);
      expect(deleteResult.error).toBe('プロジェクトが存在しません。');
    });
  });
});