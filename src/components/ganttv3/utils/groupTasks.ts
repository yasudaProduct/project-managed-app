import { Task, GroupBy, GanttPhase } from '../gantt';

export interface TaskGroup {
  id: string;
  name: string;
  tasks: Task[];
  color?: string;
}

export function groupTasksByType(
  tasks: Task[],
  groupBy: GroupBy,
  phases: GanttPhase[]
): TaskGroup[] {
  if (groupBy === 'none') {
    return [{ id: 'all', name: 'すべてのタスク', tasks }];
  }

  const groups: Map<string, Task[]> = new Map();

  switch (groupBy) {
    case 'phase':
      // フェーズでグループ化
      tasks.forEach(task => {
        const phaseKey = task.category || '未分類';
        if (!groups.has(phaseKey)) {
          groups.set(phaseKey, []);
        }
        groups.get(phaseKey)!.push(task);
      });

      // フェーズ情報を使用してグループを作成
      const phaseGroups: TaskGroup[] = [];
      phases.forEach(phase => {
        const phaseTasks = groups.get(phase.name) || [];
        if (phaseTasks.length > 0) {
          phaseGroups.push({
            id: phase.id,
            name: phase.name,
            tasks: phaseTasks,
            color: phase.color
          });
        }
      });

      // 未分類タスクがある場合は追加
      const unassignedTasks = groups.get('未分類');
      if (unassignedTasks && unassignedTasks.length > 0) {
        phaseGroups.push({
          id: 'unassigned',
          name: '未分類',
          tasks: unassignedTasks,
          color: '#888888'
        });
      }

      return phaseGroups;

    case 'assignee':
      // 担当者でグループ化
      tasks.forEach(task => {
        const assigneeKey = task.assignee || '未割当';
        if (!groups.has(assigneeKey)) {
          groups.set(assigneeKey, []);
        }
        groups.get(assigneeKey)!.push(task);
      });

      return Array.from(groups.entries()).map(([name, tasks]) => ({
        id: `assignee-${name}`,
        name,
        tasks,
        color: getAssigneeColor(name)
      }));

    case 'status':
      // ステータスでグループ化
      const statusLabels = {
        notStarted: '未着手',
        inProgress: '進行中',
        completed: '完了',
        delayed: '遅延',
        onHold: '保留'
      };

      const statusColors = {
        notStarted: '#9CA3AF',
        inProgress: '#3B82F6',
        completed: '#10B981',
        delayed: '#EF4444',
        onHold: '#F59E0B'
      };

      tasks.forEach(task => {
        const status = task.status || 'notStarted';
        if (!groups.has(status)) {
          groups.set(status, []);
        }
        groups.get(status)!.push(task);
      });

      return Array.from(groups.entries()).map(([status, tasks]) => (
        {
        id: `status-${status}`,
        name: statusLabels[status as keyof typeof statusLabels] || status,
        tasks,
        color: statusColors[status as keyof typeof statusColors] || '#888888'
      }));

    default:
      return [{ id: 'all', name: 'すべてのタスク', tasks }];
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