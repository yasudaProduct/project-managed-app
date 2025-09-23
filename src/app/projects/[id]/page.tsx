import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getProjectById } from "../project-actions";
import { getWbsByProjectId } from "./wbs/wbs-actions";
import { ProjectDetailClient } from "@/components/projects/project-detail-client";
import { Calendar, FileText, Edit, Plus, ArrowLeft } from "lucide-react";
import { getProjectStatusName } from "@/lib/utils";
import { formatDate } from "@/lib/date-util";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = await params;

  const project = await getProjectById(projectId);
  const wbsList = await getWbsByProjectId(projectId);

  if (!project) {
    notFound();
  }

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
            <Link href={`/projects/${project.id}/wbs/new`}>
              <Button size="sm" variant="secondary" className="gap-2">
                <Plus className="h-4 w-4" />
                WBS作成
              </Button>
            </Link>
            {/* <Link href={`/qqa/${project.id}`}>
              <Button size="sm" variant="outline" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                定量品質評価
              </Button>
            </Link> */}
          </div>
        </div>
      </div>

      <div className="mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              プロジェクト詳細
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                説明
              </h3>
              <p className="text-sm leading-relaxed">
                {project.description || "説明がありません"}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                  プロジェクトID
                </h3>
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4" />
                  {project.id}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                  開始日
                </h3>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4" />
                  {formatDate(project.startDate, "YYYY/MM/DD")}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                  終了予定日
                </h3>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4" />
                  {formatDate(project.endDate, "YYYY/MM/DD")}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                  WBS数
                </h3>
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4" />
                  {wbsList?.length || 0} 件
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <ProjectDetailClient wbsList={wbsList || []} projectId={project.id!} />
    </div>
  );
}
