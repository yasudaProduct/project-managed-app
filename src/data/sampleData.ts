import { Task, Category, GanttStyle } from '@yasudaProduct/my-gantt-chart';

export const sampleTasks: Task[] = [
    {
        id: '1',
        name: 'R&D、設計、調達、計画の開始',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-01'),
        duration: 0,
        progress: 100,
        color: '#3B82F6',
        isMilestone: true,
        predecessors: [],
        level: 0,
        isManuallyScheduled: false,
        isOnCriticalPath: true,
        category: 'R&Dと準備',
        description: 'プロジェクト計画フェーズの開始',
        resources: ['プロジェクトマネージャー', 'R&Dチーム']
    },
    {
        id: '2',
        name: 'EES開発',
        startDate: new Date('2024-09-01'),
        endDate: new Date('2025-11-30'),
        duration: 456,
        progress: 25,
        color: '#10B981',
        isMilestone: false,
        predecessors: [{ taskId: '1', type: 'FS', lag: 0 }],
        level: 0,
        isManuallyScheduled: false,
        isOnCriticalPath: true,
        category: '開発',
        description: '電気・電子システム開発',
        resources: ['エレクトロニクスエンジニア', 'ソフトウェア開発者']
    },
    {
        id: '3',
        name: 'プロトタイプソフトウェア開発',
        startDate: new Date('2024-08-01'),
        endDate: new Date('2026-02-28'),
        duration: 577,
        progress: 15,
        color: '#F59E0B',
        isMilestone: false,
        predecessors: [{ taskId: '1', type: 'FS', lag: 0 }],
        level: 0,
        isManuallyScheduled: false,
        isOnCriticalPath: false,
        category: '開発',
        description: 'プロトタイプソフトウェア開発',
        resources: ['ソフトウェア開発者', 'ファームウェアエンジニア']
    },
    {
        id: '4',
        name: 'ベンチテスト',
        startDate: new Date('2025-04-01'),
        endDate: new Date('2025-09-30'),
        duration: 183,
        progress: 0,
        color: '#8B5CF6',
        isMilestone: false,
        predecessors: [{ taskId: '2', type: 'FS', lag: 30 }],
        level: 0,
        isManuallyScheduled: false,
        isOnCriticalPath: true,
        category: 'テスト',
        description: '初期ベンチレベルの機能テスト',
        resources: ['テストエンジニア', 'ラボ技術者']
    },
    {
        id: '5',
        name: '60%設計報告書',
        startDate: new Date('2025-05-08'),
        endDate: new Date('2025-05-08'),
        duration: 0,
        progress: 100,
        color: '#EF4444',
        isMilestone: true,
        predecessors: [{ taskId: '2', type: 'FS', lag: 0 }],
        level: 0,
        isManuallyScheduled: false,
        isOnCriticalPath: true,
        category: 'ドキュメント',
        description: '60%設計ドキュメントの完了',
        resources: ['設計チーム', 'エンジニア']
    },
    {
        id: '6',
        name: 'プロトタイプ出荷 + J4',
        startDate: new Date('2025-09-01'),
        endDate: new Date('2025-09-01'),
        duration: 0,
        progress: 0,
        color: '#8B5CF6',
        isMilestone: true,
        predecessors: [{ taskId: '4', type: 'FS', lag: 0 }],
        level: 0,
        isManuallyScheduled: false,
        isOnCriticalPath: true,
        category: 'マイルストーン',
        description: 'プロトタイプの出荷とJ4マイルストーン',
        resources: ['プロジェクトマネージャー', 'ロジスティクスチーム']
    }
];

export const sampleCategories: Category[] = [
    {
        id: '1',
        name: 'R&Dと準備',
        color: '#3B82F6',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-01')
    },
    {
        id: '2',
        name: '開発',
        color: '#10B981',
        startDate: new Date('2024-08-01'),
        endDate: new Date('2026-02-28')
    },
    {
        id: '3',
        name: 'テスト',
        color: '#8B5CF6',
        startDate: new Date('2025-04-01'),
        endDate: new Date('2025-09-30')
    },
    {
        id: '4',
        name: 'ドキュメント',
        color: '#EF4444',
        startDate: new Date('2025-05-08'),
        endDate: new Date('2025-05-08')
    },
    {
        id: '5',
        name: 'マイルストーン',
        color: '#8B5CF6',
        startDate: new Date('2025-09-01'),
        endDate: new Date('2025-09-01')
    }
];

export const defaultGanttStyle: GanttStyle = {
    theme: 'modern',
    showGrid: true,
    showProgress: true,
    showDependencies: true,
    showCriticalPath: true,
    showWeekends: true,
    showTodayLine: true,
    taskHeight: 16,
    rowSpacing: 4,
    labelPosition: 'inside',
    colors: {
        primary: '#3B82F6',
        secondary: '#6B7280',
        accent: '#10B981',
        milestone: '#EF4444',
        criticalPath: '#DC2626',
        weekend: '#F3F4F6',
        today: '#F59E0B'
    }
};
