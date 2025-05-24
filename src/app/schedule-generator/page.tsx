import { ScheduleGenerator } from "@/components/wbs/schedule-generator";
import { getProjects } from "./action";

export default async function ScheduleGeneratorPage() {
  const projects = await getProjects();

  if (!projects) {
    return <div>プロジェクトが見つかりません</div>;
  }

  return (
    <div className="container mx-auto mt-10">
      <h1 className="text-2xl font-bold mb-4">予定自動作成</h1>
      <div className="flex flex-col gap-4 mb-10">
        <p>タスクのCSVをアップロードすると、予定が自動で作成されます。</p>
        <ScheduleGenerator
          projects={projects.map((project) => ({
            id: project.id,
            name: project.name,
            status: project.status,
            startDate: project.startDate,
            endDate: project.endDate,
            wbs: project.wbs,
          }))}
        />
      </div>
    </div>
  );
}
