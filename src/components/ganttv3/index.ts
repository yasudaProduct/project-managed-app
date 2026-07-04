// Main component exports
export { GanttChart } from './GanttChart';
export { TaskBar } from './TaskBar';
export { TimelineHeader } from './TimelineHeader';
export { GridLines } from './GridLines';
export { DependencyArrows } from './DependencyArrows';
export { ViewSwitcher } from './ViewSwitcher';
export { QuickActions } from './QuickActions';

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
export { GanttChart as default } from './GanttChart';
