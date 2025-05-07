// filepath: /Users/yuta/Develop/project-managed-app/src/__integration_tests__/infrastructures/project-repository.test.ts
import { ProjectRepository } from '@/infrastructures/project-repository';
import { Project } from '@/domains/project/project';
import { ProjectStatus } from '@/domains/project/project-status';
import { createTestProject, cleanupTestData, testIds } from '../helpers';

describe('ProjectRepository Integration Tests', () => {
  let projectRepository: ProjectRepository;
  let project: Project;
  const startDate = new Date('2025-05-01');
  const endDate = new Date('2025-12-31');

  beforeAll(() => {
    // リポジトリインスタンスの作成（実際のPrismaクライアントを使用）
    projectRepository = new ProjectRepository();
  });

  afterAll(async () => {
    // テストデータのクリーンアップ
    await cleanupTestData(global.prisma);
  });

  describe('プロジェクトのCRUD操作', () => {
    it('プロジェクトを作成できること', async () => {
      // テスト用のプロジェクトを作成
      project = createTestProject({
        name: `統合テスト用プロジェクト-${Date.now()}`,
        description: '統合テストで作成されたプロジェクト',
        startDate,
        endDate,
      });

      // リポジトリを使用してプロジェクトを作成
      const createdProject = await projectRepository.create(project);

      // 作成されたプロジェクトを検証
      expect(createdProject).toBeTruthy();
      expect(createdProject.id).toBeTruthy(); // IDが生成されていること
      expect(createdProject.name).toBe(project.name);
      expect(createdProject.description).toBe(project.description);
      expect(createdProject.getStatus()).toBe('ACTIVE');
      expect(createdProject.startDate).toEqual(startDate);
      expect(createdProject.endDate).toEqual(endDate);

      testIds.projectId = createdProject.id!; // 後のテスト・クリーンアップで使用
    });

    it('IDによるプロジェクト取得', async () => {
      // 先ほど作成したプロジェクトをIDで取得
      const fetchedProject = await projectRepository.findById(testIds.projectId);

      // 取得したプロジェクトを検証
      expect(fetchedProject).not.toBeNull();
      expect(fetchedProject?.id).toBe(testIds.projectId);
      expect(fetchedProject?.name).toBe(project.name);
      expect(fetchedProject?.description).toBe(project.description);
    });

    it('名前によるプロジェクト取得', async () => {
      // 先ほど作成したプロジェクトを名前で取得
      const fetchedProject = await projectRepository.findByName(project.name);

      // 取得したプロジェクトを検証
      expect(fetchedProject).not.toBeNull();
      expect(fetchedProject?.id).toBe(testIds.projectId);
      expect(fetchedProject?.name).toBe(project.name);
    });

    it('全プロジェクト取得', async () => {
      // 全プロジェクトを取得
      const projects = await projectRepository.findAll();

      // 少なくとも1つのプロジェクト（テストで作成したもの）があることを確認
      expect(projects.length).toBeGreaterThanOrEqual(1);

      // テストで作成したプロジェクトが含まれていることを確認
      const testProject = projects.find(p => p.id === testIds.projectId);
      expect(testProject).toBeTruthy();
      expect(testProject?.name).toBe(project.name);
    });

    it('プロジェクト情報の更新', async () => {
      // プロジェクト情報を更新
      const updatedName = `更新されたプロジェクト-${Date.now()}`;
      const updatedDescription = '更新された説明文';
      const updatedStatus = new ProjectStatus({ status: 'DONE' });

      // 先ほど取得したプロジェクトを更新
      const projectToUpdate = Project.createFromDb({
        id: testIds.projectId,
        name: updatedName,
        description: updatedDescription,
        startDate: new Date('2025-06-01'), // 更新された日付
        endDate: new Date('2025-11-30'), // 更新された日付
        status: updatedStatus
      });

      const updatedProject = await projectRepository.update(projectToUpdate);

      // 更新されたプロジェクトを検証
      expect(updatedProject).toBeTruthy();
      expect(updatedProject.id).toBe(testIds.projectId);
      expect(updatedProject.name).toBe(updatedName);
      expect(updatedProject.description).toBe(updatedDescription);
      expect(updatedProject.getStatus()).toBe('DONE');
      expect(updatedProject.startDate).toEqual(new Date('2025-06-01'));
      expect(updatedProject.endDate).toEqual(new Date('2025-11-30'));

      // 実際にDBが更新されたことを確認するためにfindByIdで再取得
      const refetchedProject = await projectRepository.findById(testIds.projectId);
      expect(refetchedProject?.name).toBe(updatedName);
      expect(refetchedProject?.description).toBe(updatedDescription);
      expect(refetchedProject?.getStatus()).toBe('DONE');
    });

    it('プロジェクト削除', async () => {
      // プロジェクトを削除
      await projectRepository.delete(testIds.projectId);

      // 削除されたことを確認
      const deletedProject = await projectRepository.findById(testIds.projectId);
      expect(deletedProject).toBeNull();

      // クリーンアップ処理でエラーが発生しないようにIDをリセット
      testIds.projectId = '';
    });
  });

  describe('エラーケース', () => {
    it('存在しないプロジェクトIDを指定した場合はnullを返すこと', async () => {
      const nonExistingProject = await projectRepository.findById('non-existing-id');
      expect(nonExistingProject).toBeNull();
    });

    it('存在しないプロジェクト名を指定した場合はnullを返すこと', async () => {
      const nonExistingProject = await projectRepository.findByName('存在しない名前');
      expect(nonExistingProject).toBeNull();
    });
  });
});