import { notFound } from "next/navigation";
import { ProjectForm } from "../../project-form";
import { getProjectById } from "../../actions";
export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = await params;

  const project = await getProjectById(projectId);

  if (!project) {
    notFound();
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">プロジェクト編集</h1>
      <ProjectForm
        project={{
          id: project.id,
          name: project.name,
          description: project.description!,
          startDate: project.startDate,
          endDate: project.endDate,
          status: project.status,
        }}
      />
    </div>
  );
}
