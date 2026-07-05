// Main component exports
export { GanttChart } from './gantt-chart';
export { TaskBar } from './task-bar';
export { TimelineHeader } from './timeline-header';
export { GridLines } from './grid-lines';
export { DependencyArrows } from './dependency-arrows';
export { ViewSwitcher } from './view-switcher';
export { QuickActions } from './quick-actions';

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
