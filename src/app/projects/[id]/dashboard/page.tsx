import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getProjectById } from "../../project-actions";
import { getLatestWbsByProjectId } from "../wbs/wbs-actions";
import { Loader2 } from "lucide-react";
import { DashboardOverview } from "@/app/dashboard/_components/dashboard-overview";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function ProjectDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = await params;

  const project = await getProjectById(projectId);
  if (!project) {
    notFound();
  }

  const latestWbs = await getLatestWbsByProjectId(projectId);
  if (!latestWbs) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center gap-2 mb-4">
          <Link
            href="/projects"
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <span className="text-muted-foreground">/</span>
          <Link
            href="/projects"
            className="text-muted-foreground hover:text-foreground"
          >
            プロジェクト一覧
          </Link>
          <span className="text-muted-foreground">/</span>
          <Link
            href={`/projects/${project.id}`}
            className="text-muted-foreground hover:text-foreground"
          >
            {project.name}
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="font-medium">ダッシュボード</span>
        </div>

        <div className="text-center py-8">
          <p className="text-muted-foreground">
            このプロジェクトにはまだWBSが作成されていません。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center gap-2 mb-4">
        <Link
          href="/projects"
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <span className="text-muted-foreground">/</span>
        <Link
          href="/projects"
          className="text-muted-foreground hover:text-foreground"
        >
          プロジェクト一覧
        </Link>
        <span className="text-muted-foreground">/</span>
        <Link
          href={`/projects/${project.id}`}
          className="text-muted-foreground hover:text-foreground"
        >
          {project.name}
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="font-medium">ダッシュボード</span>
      </div>

      <Suspense
        fallback={
          <div className="flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        }
      >
        <DashboardOverview wbsId={latestWbs.id} />
      </Suspense>
    </div>
  );
}