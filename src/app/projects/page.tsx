import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import { getProjectAll } from "./project-actions";
import { columns } from "./columns";
import { getProjectStatusName } from "@/lib/utils";
import { formatDate } from "@/lib/date-util";

export default async function ProjectsPage() {
  const projects = await getProjectAll();

  if (!projects) {
    return <div>プロジェクトが見つかりませんでした。</div>;
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">プロジェクト一覧</h1>
        <Link href="/projects/new">
          <Button>新規プロジェクト作成</Button>
        </Link>
      </div>
      <DataTable
        columns={columns}
        data={projects.map((project) => {
          return {
            id: project.id,
            name: project.name,
            description: project.description,
            startDate: formatDate(project.startDate, "YYYY/MM/DD"),
            endDate: formatDate(project.endDate, "YYYY/MM/DD"),
            status: getProjectStatusName(project.status),
            link: `/projects/${project.id}`,
          };
        })}
      />
    </div>
  );
}
