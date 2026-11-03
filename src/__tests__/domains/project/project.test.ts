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
      expect(project.getStatus()).toBe('INACTIVE');
    });

    it('説明なしでプロジェクトを作成できること', () => {
      const project = Project.create({
        name: 'テストプロジェクト',
        startDate,
        endDate
      });

      expect(project).toBeInstanceOf(Project);
      expect(project.id).toBeUndefined();
      expect(project.name).toBe('テストプロジェクト');
      expect(project.description).toBeUndefined();
      expect(project.startDate).toEqual(startDate);
      expect(project.endDate).toEqual(endDate);
      expect(project.getStatus()).toBe('INACTIVE');
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

    it('updateStatus: ステータスを更新できること', () => {
      const newStatus = new ProjectStatus({ status: 'ACTIVE' });
      project.updateStatus(newStatus);
      expect(project.getStatus()).toBe('ACTIVE');
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
/**
 * プロジェクトの種別（案件 / 常設）。
 * docs/plans/non-project-work-management.md §6.2, §11
 * - 種別を省略すると案件（PROJECT）。既存の挙動を変えない
 * - 分類（category）は常設（STANDING）のみ持てる
 */
describe('Project の種別（kind）と分類（category）', () => {
  const startDate = new Date('2026-04-01');
  const endDate = new Date('2027-03-31');

  it('種別を省略すると案件（PROJECT）になり、常設ではないこと', () => {
    const project = Project.create({ name: '案件A', startDate, endDate });

    expect(project.kind).toBe('PROJECT');
    expect(project.category).toBeUndefined();
    expect(project.isStanding()).toBe(false);
  });

  it('常設（STANDING）として分類付きで作成できること', () => {
    const project = Project.create({
      name: '保守 X システム',
      startDate,
      endDate,
      kind: 'STANDING',
      category: 'MAINTENANCE',
    });

    expect(project.kind).toBe('STANDING');
    expect(project.category).toBe('MAINTENANCE');
    expect(project.isStanding()).toBe(true);
  });

  it('常設は分類なしでも作成できること', () => {
    const project = Project.create({ name: '社内業務', startDate, endDate, kind: 'STANDING' });

    expect(project.isStanding()).toBe(true);
    expect(project.category).toBeUndefined();
  });

  it('案件に分類を付けると例外になること', () => {
    expect(() =>
      Project.create({ name: '案件A', startDate, endDate, kind: 'PROJECT', category: 'INTERNAL' })
    ).toThrow('分類は常設プロジェクトのみ設定できます');
  });

  it('DBから種別・分類を復元できること', () => {
    const project = Project.createFromDb({
      id: 'project-1',
      name: '社内業務',
      status: new ProjectStatus({ status: 'ACTIVE' }),
      startDate,
      endDate,
      kind: 'STANDING',
      category: 'INTERNAL',
    });

    expect(project.kind).toBe('STANDING');
    expect(project.category).toBe('INTERNAL');
  });

  it('DBからの復元で種別を省略すると案件になること（既存データ互換）', () => {
    const project = Project.createFromDb({
      id: 'project-1',
      name: '案件A',
      status: new ProjectStatus({ status: 'ACTIVE' }),
      startDate,
      endDate,
    });

    expect(project.kind).toBe('PROJECT');
  });

  it('常設の分類を更新できること', () => {
    const project = Project.create({ name: '社内業務', startDate, endDate, kind: 'STANDING' });

    project.updateCategory('OTHER');

    expect(project.category).toBe('OTHER');
  });

  it('案件の分類を更新しようとすると例外になること', () => {
    const project = Project.create({ name: '案件A', startDate, endDate });

    expect(() => project.updateCategory('OTHER')).toThrow('分類は常設プロジェクトのみ設定できます');
  });
});
