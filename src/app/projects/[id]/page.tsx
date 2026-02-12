import { notFound } from "next/navigation";
import { getProjectById } from "../actions";
import { getLatestWbsByProjectId, getWbsBuffers } from "@/app/wbs/[id]/actions/wbs-actions";
import { getWbsPhases } from "@/app/wbs/[id]/actions/wbs-phase-actions";
import { getWbsAssignees } from "@/app/wbs/assignee/assignee-actions";
import { getTaskAll } from "@/app/wbs/[id]/actions/wbs-task-actions";
import { getMilestones } from "@/app/wbs/[id]/actions/milestone-actions";
import { ArrowLeft, Edit } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getProjectSettings } from "@/app/wbs/[id]/project-settings-actions";
import { Badge } from "@/components/ui/badge";
import { getProjectStatusName } from "@/utils/utils";
import { WbsManagementContent } from "@/components/wbs/wbs-management-content";

export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id: projectId } = await params;
  const { tab } = await searchParams;

  const project = await getProjectById(projectId);
  if (!project) {
    notFound();
  }

  // プロジェクトに対する最新のWBSを取得
  const latestWbs = await getLatestWbsByProjectId(projectId);
  if (!latestWbs) {
    // WBSが存在しない場合は、プロジェクトの基本情報のみ表示
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
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
            <span className="font-medium">{project.name}</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{project.name}</h1>
              <Badge
                variant={project.status === "ACTIVE" ? "default" : "secondary"}
                className="text-xs"
              >
                {getProjectStatusName(project.status)}
              </Badge>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link href={`/projects/${project.id}/edit`}>
                <Button size="sm" className="gap-2">
                  <Edit className="h-4 w-4" />
                  編集
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="text-center py-8">
          <p className="text-muted-foreground">
            このプロジェクトにはまだWBSが作成されていません。
          </p>
        </div>
      </div>
    );
  }

  // WBS関連のデータを取得
  const [tasks, buffers, phases, assignees, milestones, settings] =
    await Promise.all([
      getTaskAll(latestWbs.id),
      getWbsBuffers(latestWbs.id),
      getWbsPhases(latestWbs.id),
      getWbsAssignees(latestWbs.id),
      getMilestones(latestWbs.id),
      getProjectSettings(projectId),
    ]);

  return (
    <div className="container mx-auto mt-2">
      {/* パンくずリスト */}
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
        <span className="font-medium">{project.name}</span>
      </div>

      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold">{project.name}</h1>
          <Badge
            variant={project.status === "ACTIVE" ? "default" : "secondary"}
            className="text-xs"
          >
            {getProjectStatusName(project.status)}
          </Badge>
        </div>

        <Link href={`/projects/${project.id}/edit`}>
          <Button size="sm" className="gap-2">
            <Edit className="h-4 w-4" />
            プロジェクト編集
          </Button>
        </Link>
      </div>

      <WbsManagementContent
        wbsId={latestWbs.id}
        wbsName={latestWbs.name}
        project={project}
        tasks={tasks}
        buffers={buffers}
        phases={phases}
        assignees={assignees}
        milestones={milestones}
        defaultTab={tab}
        showEvm={true}
        showTags={false}
        defaultProgressMethod={settings.progressMeasurementMethod}
      />
    </div>
  );
}
