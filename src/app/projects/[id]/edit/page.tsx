import { notFound } from "next/navigation";
import { ProjectForm } from "../../project-form";
import prisma from "@/lib/prisma";
import { Projects } from "@prisma/client";

export default async function EditProjectPage({
  params,
}: {
  params: { id: string };
}) {
  const project: Projects | null = await prisma.projects.findUnique({
    where: {
      id: params.id,
    },
  });

  console.log("EditProjectPage project:", project);

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
          startDate: project.startDate.toISOString(),
          endDate: project.endDate.toISOString(),
          status: project.status,
        }}
      />
    </div>
  );
}
