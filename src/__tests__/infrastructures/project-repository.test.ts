// filepath: /Users/yuta/Develop/project-managed-app/src/__tests__/infrastructures/project-repository.test.ts
import { ProjectRepository } from "@/infrastructures/project-repository";
import { Project } from "@/domains/project/project";
import { ProjectStatus } from "@/domains/project/project-status";
import prisma from "@/lib/prisma";

// Prismaクライアントのモック化
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    projects: {
      findUnique: jest.fn() as jest.Mock, 
      findFirst: jest.fn() as jest.Mock,
      findMany: jest.fn() as jest.Mock,
      create: jest.fn() as jest.Mock,
      update: jest.fn() as jest.Mock,
      delete: jest.fn() as jest.Mock,
    },
  },
}));

describe('ProjectRepository', () => {
  let projectRepository: ProjectRepository;
  const prismaMock = prisma as jest.Mocked<typeof prisma>;
  const startDate = new Date('2025-01-01');
  const endDate = new Date('2025-12-31');

  beforeEach(() => {
    projectRepository = new ProjectRepository();
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('存在するIDのプロジェクトを取得できること', async () => {
      // モックの設定
      const mockProjectData = {
        id: 'project-1',
        name: 'テストプロジェクト',
        description: 'テスト用のプロジェクト',
        status: 'ACTIVE',
        startDate,
        endDate,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      (prismaMock.projects.findUnique as jest.Mock).mockResolvedValue(mockProjectData);

      // メソッド実行
      const project = await projectRepository.findById('project-1');

      // 検証
      expect(prismaMock.projects.findUnique).toHaveBeenCalledWith({
        where: { id: 'project-1' }
      });
      expect(project).not.toBeNull();
      expect(project?.id).toBe('project-1');
      expect(project?.name).toBe('テストプロジェクト');
      expect(project?.description).toBe('テスト用のプロジェクト');
      expect(project?.getStatus()).toBe('ACTIVE');
      expect(project?.startDate).toEqual(startDate);
      expect(project?.endDate).toEqual(endDate);
    });

    it('存在しないIDの場合はnullを返すこと', async () => {
      (prismaMock.projects.findUnique as jest.Mock).mockResolvedValue(null);

      const project = await projectRepository.findById('not-exist');

      expect(prismaMock.projects.findUnique).toHaveBeenCalledWith({
        where: { id: 'not-exist' }
      });
      expect(project).toBeNull();
    });
  });

  describe('findByName', () => {
    it('存在する名前のプロジェクトを取得できること', async () => {
      const mockProjectData = {
        id: 'project-1',
        name: 'テストプロジェクト',
        description: 'テスト用のプロジェクト',
        status: 'ACTIVE',
        startDate,
        endDate,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      (prismaMock.projects.findFirst as jest.Mock).mockResolvedValue(mockProjectData);

      const project = await projectRepository.findByName('テストプロジェクト');

      expect(prismaMock.projects.findFirst).toHaveBeenCalledWith({
        where: { name: 'テストプロジェクト' }
      });
      expect(project).not.toBeNull();
      expect(project?.name).toBe('テストプロジェクト');
    });

    it('存在しない名前の場合はnullを返すこと', async () => {
      (prismaMock.projects.findFirst as jest.Mock).mockResolvedValue(null);

      const project = await projectRepository.findByName('存在しないプロジェクト');

      expect(prismaMock.projects.findFirst).toHaveBeenCalledWith({
        where: { name: '存在しないプロジェクト' }
      });
      expect(project).toBeNull();
    });
  });

  describe('findAll', () => {
    it('すべてのプロジェクトを取得できること', async () => {
      const mockProjectsData = [
        {
          id: 'project-1',
          name: 'プロジェクト1',
          description: 'テスト用プロジェクト1',
          status: 'ACTIVE',
          startDate,
          endDate,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'project-2',
          name: 'プロジェクト2',
          description: 'テスト用プロジェクト2',
          status: 'PENDING',
          startDate: new Date('2025-02-01'),
          endDate: new Date('2025-11-30'),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      
      prismaMock.projects.findMany.mockResolvedValue(mockProjectsData);

      const projects = await projectRepository.findAll();

      expect(prismaMock.projects.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: "desc" }
      });
      expect(projects.length).toBe(2);
      expect(projects[0].id).toBe('project-1');
      expect(projects[1].id).toBe('project-2');
      expect(projects[0].getStatus()).toBe('ACTIVE');
      expect(projects[1].getStatus()).toBe('PENDING');
    });

    it('プロジェクトが存在しない場合は空の配列を返すこと', async () => {
      (prismaMock.projects.findMany as jest.Mock).mockResolvedValue([]);

      const projects = await projectRepository.findAll();

      expect(projects).toEqual([]);
    });
  });

  describe('create', () => {
    it('プロジェクトを新規作成できること', async () => {
      // 作成するプロジェクトを準備
      const newProject = Project.create({
        name: '新規プロジェクト',
        description: '新規作成テスト',
        startDate,
        endDate,
      });

      // create関数の戻り値をモック
      const mockCreatedProject = {
        id: 'project-new',
        name: '新規プロジェクト',
        description: '新規作成テスト',
        status: 'INACTIVE',
        startDate,
        endDate,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      (prismaMock.projects.create as jest.Mock).mockResolvedValue(mockCreatedProject);

      // メソッド実行
      const createdProject = await projectRepository.create(newProject);

      // 検証
      expect(prismaMock.projects.create).toHaveBeenCalledWith({
        data: {
          name: '新規プロジェクト',
          description: '新規作成テスト',
          status: 'INACTIVE',
          startDate,
          endDate,
        }
      });
      expect(createdProject.id).toBe('project-new');
      expect(createdProject.name).toBe('新規プロジェクト');
      expect(createdProject.description).toBe('新規作成テスト');
      expect(createdProject.getStatus()).toBe('INACTIVE');
    });
  });

  describe('update', () => {
    it('プロジェクト情報を更新できること', async () => {
      // 更新するプロジェクトを準備
      const project = Project.createFromDb({
        id: 'project-1',
        name: '更新後プロジェクト',
        description: '更新テスト',
        startDate: new Date('2025-03-01'),
        endDate: new Date('2025-09-30'),
        status: new ProjectStatus({ status: 'DONE' })
      });

      // update関数の戻り値をモック
      const mockUpdatedProject = {
        id: 'project-1',
        name: '更新後プロジェクト',
        description: '更新テスト',
        status: 'DONE',
        startDate: new Date('2025-03-01'),
        endDate: new Date('2025-09-30'),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      (prismaMock.projects.update as jest.Mock).mockResolvedValue(mockUpdatedProject);

      // メソッド実行
      const updatedProject = await projectRepository.update(project);

      // 検証
      expect(prismaMock.projects.update).toHaveBeenCalledWith({
        where: { id: 'project-1' },
        data: {
          name: '更新後プロジェクト',
          description: '更新テスト',
          status: 'DONE',
          startDate: new Date('2025-03-01'),
          endDate: new Date('2025-09-30'),
        }
      });
      expect(updatedProject.id).toBe('project-1');
      expect(updatedProject.name).toBe('更新後プロジェクト');
      expect(updatedProject.getStatus()).toBe('DONE');
    });
  });

  describe('delete', () => {
    it('プロジェクトを削除できること', async () => {
      (prismaMock.projects.delete as jest.Mock).mockResolvedValue({});

      await projectRepository.delete('project-1');

      expect(prismaMock.projects.delete).toHaveBeenCalledWith({
        where: { id: 'project-1' }
      });
    });
  });
});