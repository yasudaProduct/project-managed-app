import { notFound } from "next/navigation";
import { getProjectById } from "@/app/projects/project-actions";
import { getWbsById } from "@/app/projects/[id]/wbs/wbs-actions";
import { WbsForm } from "@/app/projects/[id]/wbs/wbs-form";

export default async function EditWbsPage({
  params,
}: {
  params: Promise<{ id: string; wbsId: string }>;
}) {
  const { id: projectId, wbsId } = await params;

  const project = await getProjectById(projectId);
  if (!project) {
    notFound();
  }

  const wbs = await getWbsById(Number.parseInt(wbsId));
  if (!wbs) {
    notFound();
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">WBS編集 - {project.name}</h1>
      <WbsForm projectId={projectId} wbs={wbs} />
    </div>
  );
}
