import type { WbsTask } from "@/app/types/wbs";
import { DataTable } from "@/components/data-table";
import { columns } from "./wbs-task-columns";
type WbsTaskListProps = {
  wbsId: number;
  phaseId: number;
  tasks: WbsTask[];
};

export function WbsTaskList({ wbsId, phaseId, tasks }: WbsTaskListProps) {
  return <DataTable columns={columns} data={tasks} />;
}
