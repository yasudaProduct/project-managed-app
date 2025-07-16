"use client";

import React, { useState } from 'react';
import GanttV2Component from '@/components/ganttv2/gantt-v2';
import { WbsTask, Milestone } from '@/types/wbs';
import { Project } from '@/types/project';

// テスト用のモックデータ
const mockProject: Project = {
  id: 'test-project-1',
  name: 'スクリーンショットテスト用プロジェクト',
  startDate: new Date('2024-05-01'),
  endDate: new Date('2024-05-31'),
  status: 'ACTIVE',
  description: 'テスト用プロジェクト'
};

const mockTasks: WbsTask[] = [
  {
    id: 1,
    taskNo: 'TASK-001',
    name: '要件定義',
    status: 'COMPLETED',
    assigneeId: 1,
    assignee: {
      id: 1,
      name: '田中太郎',
      displayName: '田中太郎'
    },
    phaseId: 1,
    phase: {
      id: 1,
      name: '要件定義フェーズ',
      seq: 1
    },
    yoteiStart: new Date('2024-05-01'),
    yoteiEnd: new Date('2024-05-08'),
    yoteiKosu: 64,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: 2,
    taskNo: 'TASK-002',
    name: '基本設計',
    status: 'IN_PROGRESS',
    assigneeId: 2,
    assignee: {
      id: 2,
      name: '佐藤花子',
      displayName: '佐藤花子'
    },
    phaseId: 2,
    phase: {
      id: 2,
      name: '設計フェーズ',
      seq: 2
    },
    yoteiStart: new Date('2024-05-09'),
    yoteiEnd: new Date('2024-05-16'),
    yoteiKosu: 56,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: 3,
    taskNo: 'TASK-003',
    name: '詳細設計',
    status: 'NOT_STARTED',
    assigneeId: 2,
    assignee: {
      id: 2,
      name: '佐藤花子',
      displayName: '佐藤花子'
    },
    phaseId: 2,
    phase: {
      id: 2,
      name: '設計フェーズ',
      seq: 2
    },
    yoteiStart: new Date('2024-05-17'),
    yoteiEnd: new Date('2024-05-24'),
    yoteiKosu: 48,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: 4,
    taskNo: 'TASK-004',
    name: '実装',
    status: 'NOT_STARTED',
    assigneeId: 3,
    assignee: {
      id: 3,
      name: '鈴木次郎',
      displayName: '鈴木次郎'
    },
    phaseId: 3,
    phase: {
      id: 3,
      name: '開発フェーズ',
      seq: 3
    },
    yoteiStart: new Date('2024-05-25'),
    yoteiEnd: new Date('2024-05-31'),
    yoteiKosu: 72,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  }
];

const mockMilestones: Milestone[] = [
  {
    id: 1,
    name: '要件確定',
    date: new Date('2024-05-08')
  },
  {
    id: 2,
    name: '設計完了',
    date: new Date('2024-05-24')
  },
  {
    id: 3,
    name: 'リリース',
    date: new Date('2024-05-31')
  }
];

export default function GanttTestPage() {
  const [scenario, setScenario] = useState<string>('default');

  const handleTaskUpdate = () => {
    console.log('Task updated');
  };

  const getTestData = () => {
    switch (scenario) {
      case 'empty':
        return { tasks: [], milestones: [] };
      case 'single-task':
        return { tasks: [mockTasks[0]], milestones: [] };
      case 'many-tasks':
        return { 
          tasks: Array.from({ length: 20 }, (_, i) => ({
            ...mockTasks[0],
            id: i + 1,
            name: `タスク${i + 1}`,
            yoteiStart: new Date(`2024-05-${String(Math.floor(i / 4) + 1).padStart(2, '0')}`),
            yoteiEnd: new Date(`2024-05-${String(Math.floor(i / 4) + 3).padStart(2, '0')}`)
          })),
          milestones: mockMilestones
        };
      case 'long-project':
        return {
          tasks: mockTasks.map(task => ({
            ...task,
            yoteiStart: new Date('2024-01-01'),
            yoteiEnd: new Date('2024-12-31')
          })),
          milestones: mockMilestones
        };
      default:
        return { tasks: mockTasks, milestones: mockMilestones };
    }
  };

  const { tasks, milestones } = getTestData();

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">
          ガントチャート スクリーンショットテスト
        </h1>
        
        {/* テストシナリオ選択 */}
        <div className="mb-6 p-4 bg-white rounded-lg shadow">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            テストシナリオ:
          </label>
          <select 
            data-testid="scenario-selector"
            value={scenario} 
            onChange={(e) => setScenario(e.target.value)}
            className="block w-60 px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="default">通常のプロジェクト</option>
            <option value="empty">空のプロジェクト</option>
            <option value="single-task">単一タスク</option>
            <option value="many-tasks">多数のタスク</option>
            <option value="long-project">長期プロジェクト</option>
          </select>
        </div>

        {/* ガントチャートコンポーネント */}
        <div 
          data-testid="gantt-component"
          className="bg-white rounded-lg shadow-lg overflow-hidden"
        >
          <GanttV2Component
            tasks={tasks}
            milestones={milestones}
            project={mockProject}
            wbsId={1}
            onTaskUpdate={handleTaskUpdate}
          />
        </div>
        
        {/* デバッグ情報 */}
        <div className="mt-6 p-4 bg-gray-100 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">デバッグ情報</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <strong>シナリオ:</strong> {scenario}
            </div>
            <div>
              <strong>タスク数:</strong> {tasks.length}
            </div>
            <div>
              <strong>マイルストーン数:</strong> {milestones.length}
            </div>
            <div>
              <strong>プロジェクト期間:</strong> {mockProject.startDate.toLocaleDateString()} 〜 {mockProject.endDate.toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}