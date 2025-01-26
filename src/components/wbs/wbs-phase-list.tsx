import { WbsPhase, WbsTask } from "@/types/wbs";
import { WbsTaskList } from "@/components/wbs/wbs-task-list";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

type WbsPhaseListProps = {
  wbsId: number;
  phases: WbsPhase[];
  onTaskUpdate: (
    taskId: string,
    updatedTask: Partial<WbsTask>
  ) => Promise<void>;
  onTaskDelete: (taskId: string) => Promise<void>;
};

export function WbsPhaseList({
  wbsId,
  phases,
  onTaskUpdate,
  onTaskDelete,
}: WbsPhaseListProps) {
  return (
    <div className="space-y-6">
      {phases.map((phase) => (
        <Card key={phase.id}>
          <CardHeader>
            <CardTitle>{phase.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <WbsTaskList
              wbsId={wbsId}
              phaseId={phase.id}
              tasks={phase.tasks}
              onTaskUpdate={onTaskUpdate}
              onTaskDelete={onTaskDelete}
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
