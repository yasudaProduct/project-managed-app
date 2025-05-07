// filepath: /Users/yuta/Develop/project-managed-app/src/__integration_tests__/helpers.ts
import { PrismaClient } from '@prisma/client';
import { Project } from '@/domains/project/project';
import { Phase } from '@/domains/phase/phase';
import { PhaseCode } from '@/domains/phase/phase-code';
import { Task } from '@/domains/task/task';
import { TaskStatus } from '@/domains/task/project-status';
import { TaskId } from '@/domains/task/task-id';
import { Period } from '@/domains/task/period';
import { PeriodType } from '@/domains/task/period-type';
import { ManHour } from '@/domains/task/man-hour';
import { ManHourType } from '@/domains/task/man-hour-type';

// テスト中に作成されるリソースのIDを保持するオブジェクト
export const testIds = {
  projectId: '',
  wbsId: 0,
  phaseId: 0,
  taskId: '',
  reset() {
    this.projectId = '';
    this.wbsId = 0;
    this.phaseId = 0;
    this.taskId = '';
  }
};

// テストデータを生成するヘルパー関数
export function createTestProject(overrides = {}) {
  return Project.create({
    name: `テストプロジェクト-${Date.now()}`,
    description: 'テスト用プロジェクト説明',
    startDate: new Date('2025-05-01'),
    endDate: new Date('2025-12-31'),
    ...overrides
  });
}

export function createTestPhase(wbsId: number, overrides = {}) {
  return Phase.create({
    name: `テストフェーズ-${Date.now()}`,
    code: new PhaseCode('TEST'),
    seq: 1,
    ...overrides
  });
}

export function createTestTask(wbsId: number, phaseId: number, overrides = {}) {
  const taskId = TaskId.reconstruct(`TEST-${Date.now() % 1000}`);
  return Task.create({
    id: taskId,
    wbsId,
    name: `テストタスク-${Date.now()}`,
    phaseId,
    status: new TaskStatus({ status: 'NOT_STARTED' }),
    assigneeId: 'user1',
    periods: [
      Period.create({
        startDate: new Date('2025-05-10'),
        endDate: new Date('2025-05-20'),
        type: new PeriodType({ type: 'YOTEI' }),
        manHours: [
          ManHour.create({
            kosu: 10,
            type: new ManHourType({ type: 'NORMAL' })
          })
        ]
      })
    ],
    ...overrides
  });
}

// テストデータ準備用の関数
export async function seedTestProject(prisma: PrismaClient) {
    console.log('⭐️⭐️ テストデータの準備を開始します ⭐️⭐️');
  
  // プロジェクト作成
  const projectData = await prisma.projects.create({
    data: {
      name: `Integration Test Project-${Date.now()}`,
      description: '結合テスト用プロジェクト',
      status: 'ACTIVE',
      startDate: new Date('2025-05-01'),
      endDate: new Date('2025-12-31'),
    }
  });
  
  testIds.projectId = projectData.id;
  
  // WBS作成
  const wbsData = await prisma.wbs.create({
    data: {
      name: 'テストWBS',
      projectId: projectData.id,
    }
  });
  
  testIds.wbsId = wbsData.id;
  
  // フェーズ作成
  const phaseData = await prisma.wbsPhase.create({
    data: {
      name: 'テストフェーズ',
      code: 'TEST',
      seq: 1,
      wbsId: wbsData.id,
    }
  });
  
  testIds.phaseId = phaseData.id;
  
  return { projectData, wbsData, phaseData };
}

// テスト後のクリーンアップ用の関数
export async function cleanupTestData(prisma: PrismaClient) {
  if (testIds.taskId) {
    await prisma.wbsTask.delete({ where: { id: testIds.taskId } }).catch(() => {});
  }
  if (testIds.phaseId) {
    await prisma.wbsPhase.delete({ where: { id: testIds.phaseId } }).catch(() => {});
  }
  if (testIds.wbsId) {
    await prisma.wbs.delete({ where: { id: testIds.wbsId } }).catch(() => {});
  }
  if (testIds.projectId) {
    await prisma.projects.delete({ where: { id: testIds.projectId } }).catch(() => {});
  }
  
  testIds.reset();
}

// リクエストデータを取得して指定秒数待機する関数
export function waitFor(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}