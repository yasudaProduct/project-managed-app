// Main component exports
export { GanttChart } from './gantt-chart';
export { TaskBar } from './task-bar';
export { BarLabel } from './bar-label';
export { TimelineHeader } from './timeline-header';
export { GridLines } from './grid-lines';
export { DependencyArrows } from './dependency-arrows';
export { ProgressLine } from './progress-line';
export { ViewSwitcher } from './view-switcher';
export { QuickActions } from './quick-actions';
export { TaskFilterControl } from './task-filter-control';
export { TaskTooltip } from './task-tooltip';
export { TaskDetailSidebar } from './task-detail-sidebar';

// Filter utilities
export {
    filterTasks,
    isTaskFilterActive,
    countActiveFilters,
    isValidRegex,
    EMPTY_TASK_FILTER,
    UNASSIGNED_LABEL,
} from './utils/taskFilter';
export type { TaskFilter, KeywordMode } from './utils/taskFilter';

// Type exports
export type {
    Task,
    GanttPhase as Category,
    Dependency,
    DependencyType,
    TimelineScale,
    GanttStyle,
    ProjectData,
    GroupBy,
    TaskSortBy,
    TaskStatus,
} from './gantt';

// Default export for convenience
export { GanttChart as default } from './gantt-chart';
