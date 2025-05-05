import { IProjectRepository } from "@/applications/projects/iproject-repository";
import { ProjectApplicationService } from "@/applications/projects/project-application-service";
import { Project } from "@/domains/project/project";

// Jestのモック機能を使用してリポジトリをモック化
jest.mock("@/applications/projects/iproject-repository", () => ({
  // インターフェースのモックはできないので、実体は後で作成します
}));

describe('ProjectApplicationService', () => {
  let projectRepository: jest.Mocked<IProjectRepository>;
  let projectApplicationService: ProjectApplicationService;
  const startDate = new Date('2025-01-01');
  const endDate = new Date('2025-12-31');

  beforeEach(() => {
    // モックリポジトリを作成
    projectRepository = {
      findById: jest.fn(),
      findByName: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    projectApplicationService = new ProjectApplicationService(projectRepository);
  });

  describe('getProjectById', () => {
    it('存在するIDのプロジェクトを取得できること', async () => {
      // モックの返り値を設定
      const mockProject = Project.create({
        name: 'テストプロジェクト',
        description: 'これはテスト用のプロジェクトです',
        startDate,
        endDate
      });
      // IDを設定（実際のプロジェクトではcreateメソッドで自動生成される）
      Object.defineProperty(mockProject, 'id', { value: 'project-1' });
      
      projectRepository.findById.mockResolvedValue(mockProject);

      // テスト対象メソッド実行
      const result = await projectApplicationService.getProjectById('project-1');

      // 検証
      expect(projectRepository.findById).toHaveBeenCalledWith('project-1');
      expect(result).not.toBeNull();
      expect(result?.id).toBe('project-1');
      expect(result?.name).toBe('テストプロジェクト');
      expect(result?.description).toBe('これはテスト用のプロジェクトです');
      expect(result?.startDate).toEqual(startDate);
      expect(result?.endDate).toEqual(endDate);
    });

    it('存在しないIDの場合はnullを返すこと', async () => {
      // モックが null を返すように設定
      projectRepository.findById.mockResolvedValue(null);

      const result = await projectApplicationService.getProjectById('not-exist');
      
      expect(projectRepository.findById).toHaveBeenCalledWith('not-exist');
      expect(result).toBeNull();
    });
  });

  describe('getProjectAll', () => {
    it('すべてのプロジェクトを取得できること', async () => {
      // モックの返り値を設定
      const project1 = Project.create({
        name: 'プロジェクト1',
        description: 'テスト用プロジェクト1',
        startDate,
        endDate
      });
      Object.defineProperty(project1, 'id', { value: 'project-1' });

      const project2 = Project.create({
        name: 'プロジェクト2',
        description: 'テスト用プロジェクト2',
        startDate: new Date('2025-02-01'),
        endDate: new Date('2025-11-30')
      });
      Object.defineProperty(project2, 'id', { value: 'project-2' });

      projectRepository.findAll.mockResolvedValue([project1, project2]);

      // テスト対象メソッド実行
      const results = await projectApplicationService.getProjectAll();

      // 検証
      expect(projectRepository.findAll).toHaveBeenCalled();
      expect(results).not.toBeNull();
      expect(results?.length).toBe(2);
      expect(results?.[0].id).toBe('project-1');
      expect(results?.[1].id).toBe('project-2');
    });

    it('プロジェクトが存在しない場合は空の配列を返すこと', async () => {
      projectRepository.findAll.mockResolvedValue([]);
      
      const results = await projectApplicationService.getProjectAll();
      
      expect(projectRepository.findAll).toHaveBeenCalled();
      expect(results).toEqual([]);
    });
  });

  describe('createProject', () => {
    it('プロジェクトを新規作成できること', async () => {
      // findByName が null を返すようにモック（同名のプロジェクトが存在しない）
      projectRepository.findByName.mockResolvedValue(null);
      
      // create が呼ばれたときに、IDを付与して返すようにモック
      projectRepository.create.mockImplementation((project) => {
        const newProject = { ...project };
        Object.defineProperty(newProject, 'id', { value: 'project-1' });
        return Promise.resolve(newProject);
      });

      // テスト対象メソッド実行
      const result = await projectApplicationService.createProject({
        name: '新規プロジェクト',
        description: '新規プロジェクトの説明',
        startDate,
        endDate
      });

      // 検証
      expect(projectRepository.findByName).toHaveBeenCalled();
      expect(projectRepository.create).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.id).toBe('project-1');
    });

    it('同名のプロジェクトが存在する場合はエラーを返すこと', async () => {
      // 既存のプロジェクトが存在するようにモック
      const existingProject = Project.create({
        name: '重複プロジェクト',
        description: '既存のプロジェクト',
        startDate,
        endDate
      });
      projectRepository.findByName.mockResolvedValue(existingProject);

      // 同名のプロジェクト作成を試行
      const result = await projectApplicationService.createProject({
        name: '重複プロジェクト',
        description: '別の説明',
        startDate,
        endDate
      });

      // 検証
      expect(projectRepository.findByName).toHaveBeenCalledWith('重複プロジェクト');
      expect(projectRepository.create).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
      expect(result.error).toBe('同様のプロジェクト名が存在します。');
    });
  });

  describe('updateProject', () => {
    it('プロジェクト情報を更新できること', async () => {
      // 既存のプロジェクトを返すようにモック
      const existingProject = Project.create({
        name: '更新前プロジェクト',
        description: '更新前の説明',
        startDate,
        endDate
      });
      Object.defineProperty(existingProject, 'id', { value: 'project-1' });
      projectRepository.findById.mockResolvedValue(existingProject);
      
      // 名前変更後の重複チェックでnullを返す（重複なし）
      projectRepository.findByName.mockResolvedValue(null);
      
      // 更新後のプロジェクトを返すモック
      projectRepository.update.mockImplementation((project) => {
        return Promise.resolve(project);
      });

      // テスト対象メソッド実行
      const result = await projectApplicationService.updateProject({
        id: 'project-1',
        name: '更新後プロジェクト',
        description: '更新後の説明',
        startDate: new Date('2025-03-01'),
        endDate: new Date('2025-10-31')
      });

      // 検証
      expect(projectRepository.findById).toHaveBeenCalledWith('project-1');
      expect(projectRepository.findByName).toHaveBeenCalledWith('更新後プロジェクト');
      expect(projectRepository.update).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.id).toBe('project-1');
      
      // updateに渡されたProjectオブジェクトを取得して検証
      const updatedProject = projectRepository.update.mock.calls[0][0];
      expect(updatedProject.name).toBe('更新後プロジェクト');
      expect(updatedProject.description).toBe('更新後の説明');
      expect(updatedProject.startDate).toEqual(new Date('2025-03-01'));
      expect(updatedProject.endDate).toEqual(new Date('2025-10-31'));
    });

    it('更新対象のプロジェクトが存在しない場合はエラーを返すこと', async () => {
      // 対象のプロジェクトが存在しないようにモック
      projectRepository.findById.mockResolvedValue(null);

      const result = await projectApplicationService.updateProject({
        id: 'not-exist',
        name: '存在しないプロジェクト'
      });

      expect(projectRepository.findById).toHaveBeenCalledWith('not-exist');
      expect(projectRepository.update).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
      expect(result.error).toBe('プロジェクトが存在しません。');
    });

    it('同名のプロジェクトが存在する場合はエラーを返すこと', async () => {
      // 更新対象のプロジェクトをモック
      const targetProject = Project.create({
        name: 'プロジェクト2',
        description: '説明2',
        startDate,
        endDate
      });
      Object.defineProperty(targetProject, 'id', { value: 'project-2' });
      projectRepository.findById.mockResolvedValue(targetProject);

      // 同名の別プロジェクトが存在するようにモック
      const otherProject = Project.create({
        name: 'プロジェクト1',
        description: '説明1',
        startDate,
        endDate
      });
      Object.defineProperty(otherProject, 'id', { value: 'project-1' });
      projectRepository.findByName.mockResolvedValue(otherProject);
      
      // isEqualメソッドをスパイ
      const isEqualSpy = jest.spyOn(otherProject, 'isEqual').mockReturnValue(false);

      // プロジェクト2の名前をプロジェクト1と同じにしようとする
      const result = await projectApplicationService.updateProject({
        id: 'project-2',
        name: 'プロジェクト1'
      });

      expect(projectRepository.findById).toHaveBeenCalledWith('project-2');
      expect(projectRepository.findByName).toHaveBeenCalledWith('プロジェクト1');
      expect(isEqualSpy).toHaveBeenCalledWith(targetProject);
      expect(result.success).toBe(false);
      expect(result.error).toBe('同様のプロジェクト名が存在します。');
    });

    it('一部のフィールドだけを更新できること', async () => {
      // 更新対象のプロジェクトをモック
      const targetProject = Project.create({
        name: '更新前プロジェクト',
        description: '更新前の説明',
        startDate,
        endDate
      });
      Object.defineProperty(targetProject, 'id', { value: 'project-1' });
      projectRepository.findById.mockResolvedValue(targetProject);
      
      // 重複チェックでnullを返す
      projectRepository.findByName.mockResolvedValue(null);
      
      // 更新後のプロジェクトを返す
      projectRepository.update.mockImplementation((project) => Promise.resolve(project));

      // 名前だけ更新
      const result = await projectApplicationService.updateProject({
        id: 'project-1',
        name: '名前だけ更新'
      });

      // 検証
      expect(result.success).toBe(true);
      
      // 対象のプロパティだけが更新されたことを確認
      const updatedProject = projectRepository.update.mock.calls[0][0];
      expect(updatedProject.name).toBe('名前だけ更新');
      expect(updatedProject.description).toBe('更新前の説明');
      expect(updatedProject.startDate).toEqual(startDate);
      expect(updatedProject.endDate).toEqual(endDate);
    });
  });

  describe('deleteProject', () => {
    it('プロジェクトを削除できること', async () => {
      // 削除対象のプロジェクトをモック
      const targetProject = Project.create({
        name: '削除対象プロジェクト',
        description: '削除される説明',
        startDate,
        endDate
      });
      Object.defineProperty(targetProject, 'id', { value: 'project-1' });
      projectRepository.findById.mockResolvedValue(targetProject);
      
      // deleteメソッドのモック
      projectRepository.delete.mockResolvedValue();

      // テスト対象メソッド実行
      const result = await projectApplicationService.deleteProject('project-1');

      // 検証
      expect(projectRepository.findById).toHaveBeenCalledWith('project-1');
      expect(projectRepository.delete).toHaveBeenCalledWith('project-1');
      expect(result.success).toBe(true);
      expect(result.id).toBe('project-1');
    });

    it('存在しないプロジェクトを削除しようとするとエラーを返すこと', async () => {
      // プロジェクトが存在しないようにモック
      projectRepository.findById.mockResolvedValue(null);

      const result = await projectApplicationService.deleteProject('not-exist');
      
      expect(projectRepository.findById).toHaveBeenCalledWith('not-exist');
      expect(projectRepository.delete).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
      expect(result.error).toBe('プロジェクトが存在しません。');
    });
  });
});