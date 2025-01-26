import type { WbsPhase } from "@/types/wbs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { WbsTaskList } from "./wbs-task-list";

type WbsPhaseListProps = {
  wbsId: number;
  phases: WbsPhase[];
};

export function WbsPhaseList({ wbsId, phases }: WbsPhaseListProps) {
  return (
    <div className="space-y-6">
      {phases.map((phase) => (
        <Card key={phase.id}>
          <CardHeader>
            <CardTitle>{phase.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <WbsTaskList wbsId={wbsId} phaseId={phase.id} tasks={phase.tasks} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
