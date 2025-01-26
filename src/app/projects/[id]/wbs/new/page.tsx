import { notFound } from "next/navigation";
import { WbsForm } from "@/app/projects/[id]/wbs/wbs-form";
import { getProjectById } from "@/app/projects/project-actions";

export default async function NewWbsPage({
  params,
}: {
  params: { id: string };
}) {
  const project = await getProjectById(params.id);
  if (!project) {
    notFound();
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">新規WBS作成 - {project.name}</h1>
      <WbsForm projectId={params.id} />
    </div>
  );
}
