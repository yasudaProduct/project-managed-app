import { Project } from "@/domains/project/project";
import { ProjectStatus } from "@/domains/project/project-status";

describe('Project', () => {
  const startDate = new Date('2025-01-01');
  const endDate = new Date('2025-12-31');

  describe('create', () => {
    it('名前、説明、開始日、終了日からプロジェクトを作成できること', () => {
      const project = Project.create({
        name: 'テストプロジェクト',
        description: 'これはテスト用のプロジェクトです',
        startDate,
        endDate
      });

      expect(project).toBeInstanceOf(Project);
      expect(project.id).toBeUndefined();
      expect(project.name).toBe('テストプロジェクト');
      expect(project.description).toBe('これはテスト用のプロジェクトです');
      expect(project.startDate).toEqual(startDate);
      expect(project.endDate).toEqual(endDate);
      expect(project.getStatus()).toBe('INACTIVE'); // デフォルトのステータスがINACTIVEであること
    });

    it('説明なしでプロジェクトを作成できること', () => {
      const project = Project.create({
        name: 'テストプロジェクト',
        startDate,
        endDate
      });

      expect(project).toBeInstanceOf(Project);
      expect(project.description).toBeUndefined();
    });
  });

  describe('createFromDb', () => {
    it('ID、名前、ステータス、説明、開始日、終了日からプロジェクトを作成できること', () => {
      const status = new ProjectStatus({ status: 'ACTIVE' });
      const project = Project.createFromDb({
        id: 'project-1',
        name: 'DBからのプロジェクト',
        status,
        description: 'これはDBから読み込んだプロジェクトです',
        startDate,
        endDate
      });

      expect(project).toBeInstanceOf(Project);
      expect(project.id).toBe('project-1');
      expect(project.name).toBe('DBからのプロジェクト');
      expect(project.description).toBe('これはDBから読み込んだプロジェクトです');
      expect(project.startDate).toEqual(startDate);
      expect(project.endDate).toEqual(endDate);
      expect(project.getStatus()).toBe('ACTIVE');
    });
  });

  describe('isEqual', () => {
    it('同じIDのプロジェクトは等しいと判定されること', () => {
      const status1 = new ProjectStatus({ status: 'ACTIVE' });
      const status2 = new ProjectStatus({ status: 'DONE' });

      const project1 = Project.createFromDb({
        id: 'project-1',
        name: 'プロジェクト1',
        status: status1,
        startDate,
        endDate
      });

      const project2 = Project.createFromDb({
        id: 'project-1',
        name: '異なる名前',
        status: status2,
        startDate: new Date('2025-02-01'),
        endDate: new Date('2025-11-30')
      });

      expect(project1.isEqual(project2)).toBe(true);
    });

    it('異なるIDのプロジェクトは等しくないと判定されること', () => {
      const status = new ProjectStatus({ status: 'ACTIVE' });

      const project1 = Project.createFromDb({
        id: 'project-1',
        name: 'プロジェクト1',
        status,
        startDate,
        endDate
      });

      const project2 = Project.createFromDb({
        id: 'project-2',
        name: 'プロジェクト1',
        status,
        startDate,
        endDate
      });

      expect(project1.isEqual(project2)).toBe(false);
    });

    it('IDがundefinedの場合は等しくないと判定されること', () => {
      const project1 = Project.create({
        name: 'プロジェクト1',
        startDate,
        endDate
      });

      const project2 = Project.create({
        name: 'プロジェクト1',
        startDate,
        endDate
      });

      expect(project1.isEqual(project2)).toBe(false);
    });
  });

  describe('getStatus', () => {
    it('プロジェクトのステータスを取得できること', () => {
      const status = new ProjectStatus({ status: 'DONE' });
      const project = Project.createFromDb({
        id: 'project-1',
        name: 'プロジェクト1',
        status,
        startDate,
        endDate
      });

      expect(project.getStatus()).toBe('DONE');
    });
  });

  describe('getStatusName', () => {
    it('プロジェクトのステータス名を取得できること', () => {
      const status = new ProjectStatus({ status: 'ACTIVE' });
      const project = Project.createFromDb({
        id: 'project-1',
        name: 'プロジェクト1',
        status,
        startDate,
        endDate
      });

      expect(project.getStatusName()).toBe('進行中');
    });
  });

  describe('更新メソッド', () => {
    let project: Project;

    beforeEach(() => {
      project = Project.create({
        name: 'テストプロジェクト',
        description: '説明文',
        startDate,
        endDate
      });
    });

    it('updateName: 名前を更新できること', () => {
      project.updateName('新しい名前');
      expect(project.name).toBe('新しい名前');
    });

    it('updateDescription: 説明を更新できること', () => {
      project.updateDescription('新しい説明');
      expect(project.description).toBe('新しい説明');
    });

    it('updateStartDate: 開始日を更新できること', () => {
      const newStartDate = new Date('2025-02-15');
      project.updateStartDate(newStartDate);
      expect(project.startDate).toEqual(newStartDate);
    });

    it('updateEndDate: 終了日を更新できること', () => {
      const newEndDate = new Date('2025-11-15');
      project.updateEndDate(newEndDate);
      expect(project.endDate).toEqual(newEndDate);
    });

    it('updateStartDate: 開始日が終了日より後の場合はエラーが発生すること', () => {
      const newStartDate = new Date('2025-12-15');
      project.updateEndDate(new Date('2025-01-01'));

      expect(() => project.updateStartDate(newStartDate)).toThrow();
    });

    it('updateEndDate: 終了日が開始日より前の場合はエラーが発生すること', () => {
      const newEndDate = new Date('2024-12-15');
      project.updateStartDate(new Date('2025-01-01'));

      expect(() => project.updateEndDate(newEndDate)).toThrow();
    });
  });
});