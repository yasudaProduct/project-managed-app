import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { columns } from "./columns";
import { DataTable } from "@/components/data-table";
import { getProjectById } from "../../project-actions";
import { getWbsByProjectId } from "./wbs-actions";

export default async function WbsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = await params;

  const project = await getProjectById(projectId);
  if (!project) {
    notFound();
  }

  const wbsList = await getWbsByProjectId(projectId);

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">WBS - {project.name}</h1>
        <Link href={`/projects/${projectId}/wbs/new`}>
          <Button>新規WBS作成</Button>
        </Link>
      </div>
      <DataTable
        columns={columns}
        data={
          wbsList?.map((wbs) => ({
            ...wbs,
            link: `/wbs/${wbs.id}`,
          })) ?? []
        }
      />
    </div>
  );
}
