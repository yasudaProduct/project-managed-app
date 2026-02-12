import { notFound } from "next/navigation";
import { WbsForm } from "@/components/wbs/wbs-form";
import { getProjectById } from "@/app/projects/actions";

export default async function NewWbsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProjectById(id);
  if (!project) {
    notFound();
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">新規WBS作成 - {project.name}</h1>
      <WbsForm projectId={id} />
    </div>
  );
}
