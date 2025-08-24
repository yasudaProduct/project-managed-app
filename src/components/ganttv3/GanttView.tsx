import React, { useMemo } from "react";
import { Task, TimelineScale, GanttStyle } from "./gantt";
import { Button } from "../ui/button";
import { Indent, Outdent } from "lucide-react";

interface GanttViewProps {
  tasks: Task[];
  timelineScale: TimelineScale;
  style: GanttStyle;
  selectedTasks: Set<string>;
  onTaskUpdate: (task: Task) => void;
  onTaskSelect: (selectedTasks: Set<string>) => void;
  onTaskIndent: (taskId: string) => void;
  onTaskOutdent: (taskId: string) => void;
}

export const GanttView: React.FC<GanttViewProps> = ({
  tasks,
  timelineScale,
  style,
  selectedTasks,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onTaskUpdate,
  onTaskSelect,
  onTaskIndent,
  onTaskOutdent,
}) => {
  // Calculate project date range
  const { projectStart, projectEnd, totalDays } = useMemo(() => {
    if (tasks.length === 0) {
      const today = new Date();
      return {
        projectStart: today,
        projectEnd: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000),
        totalDays: 30,
      };
    }

    const allDates = tasks.flatMap((task) => [task.startDate, task.endDate]);
    const start = new Date(Math.min(...allDates.map((d) => d.getTime())));
    const end = new Date(Math.max(...allDates.map((d) => d.getTime())));

    // Add some padding
    start.setDate(start.getDate() - 7);
    end.setDate(end.getDate() + 7);

    const totalDays = Math.ceil(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    );

    return { projectStart: start, projectEnd: end, totalDays };
  }, [tasks]);

  // Generate timeline markers based on scale
  const timelineMarkers = useMemo(() => {
    const markers: {
      date: Date;
      label: string;
      isMainMarker: boolean;
      position: number;
    }[] = [];

    let current = new Date(projectStart);
    let iterationCount = 0;
    const maxIterations = 200;

    while (current <= projectEnd && iterationCount < maxIterations) {
      let label = "";
      let isMainMarker = false;
      let nextDate = new Date(current);

      switch (timelineScale) {
        case "day":
          label = current.toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
          });
          isMainMarker = current.getDay() === 1; // Monday
          nextDate.setDate(current.getDate() + 1);
          break;

        case "week":
          // Align to Monday
          const dayOfWeek = current.getDay();
          const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
          const weekStart = new Date(current);
          weekStart.setDate(current.getDate() - daysToMonday);

          label = `${weekStart.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}`;
          isMainMarker = weekStart.getDate() <= 7; // First week of month

          nextDate = new Date(weekStart);
          nextDate.setDate(weekStart.getDate() + 7);
          current = nextDate;
          break;

        case "month":
          label = current.toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          });
          isMainMarker = current.getMonth() % 3 === 0; // Quarterly
          nextDate.setMonth(current.getMonth() + 1);
          nextDate.setDate(1);
          break;

        case "quarter":
          const quarter = Math.floor(current.getMonth() / 3) + 1;
          label = `Q${quarter} ${current.getFullYear()}`;
          isMainMarker = quarter === 1; // Yearly
          nextDate.setMonth(current.getMonth() + 3);
          nextDate.setDate(1);
          break;
      }

      // Calculate position as percentage
      const daysSinceStart = Math.ceil(
        (current.getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24)
      );
      const position = (daysSinceStart / totalDays) * 100;

      if (position >= 0 && position <= 100) {
        markers.push({
          date: new Date(current),
          label,
          isMainMarker,
          position,
        });
      }

      current = nextDate;
      iterationCount++;
    }

    return markers;
  }, [projectStart, projectEnd, totalDays, timelineScale]);

  // Calculate task position and width
  const getTaskPosition = (task: Task) => {
    const startDays = Math.ceil(
      (task.startDate.getTime() - projectStart.getTime()) /
        (1000 * 60 * 60 * 24)
    );
    const endDays = Math.ceil(
      (task.endDate.getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24)
    );

    const left = (startDays / totalDays) * 100;
    const width = ((endDays - startDays) / totalDays) * 100;

    return { left: Math.max(0, left), width: Math.max(0.5, width) };
  };

  return (
    <div className="flex flex-col h-full">
      {/* Timeline Scale Header */}
      <div className="border-b bg-card shadow-sm">
        {/* Scale Info Bar */}
        <div className="h-8 bg-muted/30 border-b flex items-center justify-between px-4">
          <span className="text-xs font-medium text-muted-foreground">
            Timeline View
          </span>
          <span className="text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full">
            {timelineScale.charAt(0).toUpperCase() + timelineScale.slice(1)}{" "}
            Scale
          </span>
        </div>

        {/* Timeline Markers */}
        <div className="relative h-16 bg-background border-b overflow-hidden">
          {/* Grid Lines */}
          {timelineMarkers.map((marker, index) => (
            <div
              key={`grid-${index}`}
              className={`absolute top-0 bottom-0 w-px ${
                marker.isMainMarker ? "bg-border" : "bg-border/40"
              }`}
              style={{ left: `${marker.position}%` }}
            />
          ))}

          {/* Time Labels */}
          {timelineMarkers.map((marker, index) => {
            // Filter out labels that are too close to each other
            const prevMarker = timelineMarkers[index - 1];
            const shouldShow =
              !prevMarker || marker.position - prevMarker.position > 8;

            if (!shouldShow) return null;

            return (
              <div
                key={`label-${index}`}
                className="absolute top-2 transform -translate-x-1/2 pointer-events-none"
                style={{ left: `${marker.position}%` }}
              >
                <div
                  className={`text-xs px-2 py-1 rounded whitespace-nowrap ${
                    marker.isMainMarker
                      ? "font-semibold text-foreground bg-primary/10 border border-primary/20"
                      : "text-muted-foreground bg-background/90 border border-border/50"
                  }`}
                >
                  {marker.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Gantt Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Task List */}
        <div className="w-80 border-r bg-card overflow-y-auto">
          <div className="sticky top-0 bg-muted/50 border-b p-2">
            <h3 className="font-medium text-sm">Tasks</h3>
          </div>

          {tasks.map((task) => (
            <div
              key={task.id}
              className={`flex items-center gap-2 p-2 border-b hover:bg-muted/50 cursor-pointer ${
                selectedTasks.has(task.id) ? "bg-primary/10" : ""
              }`}
              style={{ paddingLeft: `${16 + task.level * 20}px` }}
              onClick={() => {
                const newSelection = new Set(selectedTasks);
                if (selectedTasks.has(task.id)) {
                  newSelection.delete(task.id);
                } else {
                  newSelection.add(task.id);
                }
                onTaskSelect(newSelection);
              }}
            >
              {/* Hierarchy Controls */}
              <div className="flex items-center gap-1">
                {task.level > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      onTaskOutdent(task.id);
                    }}
                  >
                    <Outdent className="h-3 w-3" />
                  </Button>
                )}
                {task.level < 3 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      onTaskIndent(task.id);
                    }}
                  >
                    <Indent className="h-3 w-3" />
                  </Button>
                )}
              </div>

              {/* Task Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-sm"
                    style={{ backgroundColor: task.color }}
                  />
                  <span className="text-sm font-medium truncate">
                    {task.name}
                  </span>
                  {task.isMilestone && (
                    <span className="text-xs bg-orange-100 text-orange-800 px-1 rounded">
                      Milestone
                    </span>
                  )}
                  {task.isOnCriticalPath && (
                    <span className="text-xs bg-red-100 text-red-800 px-1 rounded">
                      Critical
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {task.progress}% • {task.duration} days
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Timeline Chart */}
        <div className="flex-1 overflow-auto relative">
          {/* Background Grid */}
          <div className="absolute inset-0">
            {timelineMarkers.map((marker, index) => (
              <div
                key={`chart-grid-${index}`}
                className={`absolute top-0 bottom-0 w-px ${
                  marker.isMainMarker ? "bg-border" : "bg-border/20"
                }`}
                style={{ left: `${marker.position}%` }}
              />
            ))}
          </div>

          {/* Task Bars */}
          <div className="relative">
            {tasks.map((task, index) => {
              const { left, width } = getTaskPosition(task);
              const top = index * 48 + 8; // 48px per row, 8px offset

              return (
                <div
                  key={task.id}
                  className="absolute h-8 rounded flex items-center"
                  style={{
                    left: `${left}%`,
                    width: `${width}%`,
                    top: `${top}px`,
                    backgroundColor: task.color,
                    opacity: task.isOnCriticalPath ? 1 : 0.8,
                  }}
                >
                  {/* Progress Fill */}
                  <div
                    className="absolute top-0 left-0 h-full bg-black/30 rounded"
                    style={{ width: `${task.progress}%` }}
                  />

                  {/* Task Label */}
                  <div className="relative z-10 px-2 text-white text-xs font-medium truncate">
                    {task.name}
                  </div>

                  {/* Milestone Diamond */}
                  {task.isMilestone && (
                    <div className="absolute right-0 top-1/2 transform translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-orange-500 rotate-45 border-2 border-white" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Today Line */}
          {style.showTodayLine &&
            (() => {
              const today = new Date();
              const todayDays = Math.ceil(
                (today.getTime() - projectStart.getTime()) /
                  (1000 * 60 * 60 * 24)
              );
              const todayPosition = (todayDays / totalDays) * 100;

              if (todayPosition >= 0 && todayPosition <= 100) {
                return (
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20"
                    style={{ left: `${todayPosition}%` }}
                  >
                    <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 text-xs bg-red-500 text-white px-1 rounded">
                      Today
                    </div>
                  </div>
                );
              }
              return null;
            })()}

          {/* Add minimum height for scrolling */}
          <div
            style={{ height: `${Math.max(tasks.length * 48 + 50, 400)}px` }}
          />
        </div>
      </div>
    </div>
  );
};
