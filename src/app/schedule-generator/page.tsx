import { ScheduleGenerator } from "@/components/wbs/schedule-generator";
import { getProjects } from "./action";

export default async function ScheduleGeneratorPage() {
  const projects = await getProjects();

  return (
    <div className="container mx-auto">
      <h1 className="text-2xl font-bold mb-4">予定自動作成</h1>
      <ScheduleGenerator
        projects={
          projects
            ? projects.map((project) => ({
                id: project.id,
                name: project.name,
              }))
            : []
        }
      />
    </div>
  );
}
