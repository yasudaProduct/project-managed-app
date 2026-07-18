import { Task, GroupBy, GanttPhase, TaskSortBy } from '../gantt';

export interface TaskGroup {
  id: string;
  name: string;
  tasks: Task[];
  color?: string;
}

// ステータスの並び順（昇順）: 未着手 → 進行中 → 保留 → 完了
const STATUS_ORDER: Record<string, number> = {
  NOT_STARTED: 0,
  IN_PROGRESS: 1,
  ON_HOLD: 2,
  COMPLETED: 3,
};

const STATUS_LABELS: Record<string, string> = {
  NOT_STARTED: '未着手',
  IN_PROGRESS: '進行中',
  COMPLETED: '完了',
  ON_HOLD: '保留',
};

const STATUS_COLORS: Record<string, string> = {
  NOT_STARTED: '#9CA3AF',
  IN_PROGRESS: '#3B82F6',
  COMPLETED: '#10B981',
  ON_HOLD: '#F59E0B',
};

// グループ内のタスクを指定の基準で並べ替える（値が無いものは末尾）
function sortTasksWithin(tasks: Task[], sortBy: TaskSortBy): Task[] {
  const arr = [...tasks];
  switch (sortBy) {
    case 'startDate':
      arr.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
      break;
    case 'assignee':
      arr.sort(
        (a, b) =>
          (a.assigneeSeq ?? Number.MAX_SAFE_INTEGER) -
          (b.assigneeSeq ?? Number.MAX_SAFE_INTEGER)
      );
      break;
    case 'status':
      arr.sort(
        (a, b) =>
          (STATUS_ORDER[a.status ?? ''] ?? 99) -
          (STATUS_ORDER[b.status ?? ''] ?? 99)
      );
      break;
    case 'taskNo':
    default:
      // "P-0001" 形式を数値も考慮して自然順にソート
      arr.sort((a, b) =>
        (a.taskNo ?? '').localeCompare(b.taskNo ?? '', undefined, {
          numeric: true,
        })
      );
      break;
  }
  return arr;
}

export function groupTasksByType(
  tasks: Task[],
  groupBy: GroupBy,
  phases: GanttPhase[],
  sortBy: TaskSortBy = 'taskNo'
): TaskGroup[] {
  if (groupBy === 'none') {
    return [
      { id: 'all', name: 'すべてのタスク', tasks: sortTasksWithin(tasks, sortBy) },
    ];
  }

  const groups: Map<string, Task[]> = new Map();

  switch (groupBy) {
    case 'phase': {
      // フェーズでグループ化
      tasks.forEach(task => {
        const phaseKey = task.category || '未分類';
        if (!groups.has(phaseKey)) {
          groups.set(phaseKey, []);
        }
        groups.get(phaseKey)!.push(task);
      });

      // フェーズは getPhases の並び（wbs_phase.seq 昇順）に従う
      const phaseGroups: TaskGroup[] = [];
      phases.forEach(phase => {
        const phaseTasks = groups.get(phase.name) || [];
        if (phaseTasks.length > 0) {
          phaseGroups.push({
            id: phase.id,
            name: phase.name,
            tasks: sortTasksWithin(phaseTasks, sortBy),
            color: phase.color,
          });
        }
      });

      // 未分類タスクがある場合は末尾に追加
      const unassignedTasks = groups.get('未分類');
      if (unassignedTasks && unassignedTasks.length > 0) {
        phaseGroups.push({
          id: 'unassigned',
          name: '未分類',
          tasks: sortTasksWithin(unassignedTasks, sortBy),
          color: '#888888',
        });
      }

      return phaseGroups;
    }

    case 'assignee': {
      // 担当者でグループ化
      tasks.forEach(task => {
        const assigneeKey = task.assignee || '未割当';
        if (!groups.has(assigneeKey)) {
          groups.set(assigneeKey, []);
        }
        groups.get(assigneeKey)!.push(task);
      });

      // 担当者は wbs_assignee.seq 昇順。未割当は末尾。
      return Array.from(groups.entries())
        .map(([name, groupTasks]) => ({
          group: {
            id: `assignee-${name}`,
            name,
            tasks: sortTasksWithin(groupTasks, sortBy),
            color: getAssigneeColor(name),
          },
          seq:
            name === '未割当'
              ? Number.MAX_SAFE_INTEGER
              : groupTasks[0]?.assigneeSeq ?? Number.MAX_SAFE_INTEGER,
        }))
        .sort((a, b) => a.seq - b.seq)
        .map(g => g.group);
    }

    case 'status': {
      // ステータスでグループ化
      tasks.forEach(task => {
        const status = task.status || '不明';
        if (!groups.has(status)) {
          groups.set(status, []);
        }
        groups.get(status)!.push(task);
      });

      // ステータスは NOT_STARTED → IN_PROGRESS → ON_HOLD → COMPLETED の順。未知は末尾。
      return Array.from(groups.entries())
        .map(([status, groupTasks]) => ({
          group: {
            id: `status-${status}`,
            name: STATUS_LABELS[status] || status,
            tasks: sortTasksWithin(groupTasks, sortBy),
            color: STATUS_COLORS[status] || '#888888',
          },
          order: STATUS_ORDER[status] ?? 99,
        }))
        .sort((a, b) => a.order - b.order)
        .map(g => g.group);
    }

    default:
      return [
        { id: 'all', name: 'すべてのタスク', tasks: sortTasksWithin(tasks, sortBy) },
      ];
  }
}

// 担当者用の色を生成
function getAssigneeColor(assignee: string): string {
  const colors = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
    '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16'
  ];

  // 名前から一意のインデックスを生成
  let hash = 0;
  for (let i = 0; i < assignee.length; i++) {
    hash = assignee.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
}
