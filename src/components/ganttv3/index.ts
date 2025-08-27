// Main component exports
export { GanttChart } from './GanttChart';
export { TaskBar } from './TaskBar';
export { TimelineHeader } from './TimelineHeader';
export { GridLines } from './GridLines';
export { DependencyArrows } from './DependencyArrows';
export { ProjectHeader } from './ProjectHeader';
export { ViewSwitcher } from './ViewSwitcher';
export { QuickActions } from './QuickActions';
export { TaskManager } from './TaskManager';
export { StyleCustomizer } from './StyleCustomizer';
export { ExportModal } from './ExportModal';
export { ImportModal } from './ImportModal';

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
    TaskStatus,
} from './gantt';

// Default export for convenience
export { GanttChart as default } from './GanttChart';
