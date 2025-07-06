import { notFound } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getProjectById } from "../project-actions";
import { getWbsByProjectId } from "./wbs/wbs-actions";
import { formatDateyyyymmdd } from "@/lib/utils";
import { 
  Calendar, 
  FileText, 
  Edit, 
  Plus, 
  BarChart3,
  ArrowLeft
} from "lucide-react";

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
      {/* Header with breadcrumb and actions */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Link href="/projects" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <span className="text-muted-foreground">/</span>
          <Link href="/projects" className="text-muted-foreground hover:text-foreground">
            プロジェクト一覧
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="font-medium">{project.name}</span>
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{project.name}</h1>
            <Badge 
              variant={project.status === 'ACTIVE' ? 'default' : 'secondary'}
              className="text-xs"
            >
              {project.status}
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
            <Link href={`/qqa/${project.id}`}>
              <Button size="sm" variant="outline" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                定量品質評価
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Project details */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                プロジェクト詳細
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">説明</h3>
                <p className="text-sm leading-relaxed">
                  {project.description || "説明がありません"}
                </p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">開始日</h3>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4" />
                    {formatDateyyyymmdd(project.startDate.toString())}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">終了予定日</h3>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4" />
                    {formatDateyyyymmdd(project.endDate.toString())}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* WBS List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  WBS一覧
                </CardTitle>
                <Link href={`/projects/${project.id}/wbs`}>
                  <Button variant="outline" size="sm">
                    すべて表示
                  </Button>
                </Link>
              </div>
              <CardDescription>
                このプロジェクトに関連するWBS構造
              </CardDescription>
            </CardHeader>
            <CardContent>
              {wbsList && wbsList.length > 0 ? (
                <div className="space-y-2">
                  {wbsList.slice(0, 5).map((wbs) => (
                    <div key={wbs.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div>
                        <Link
                          href={`/wbs/${wbs.id}`}
                          className="font-medium hover:text-primary transition-colors"
                        >
                          {wbs.name}
                        </Link>
                      </div>
                      <Link href={`/wbs/${wbs.id}`}>
                        <Button variant="ghost" size="sm">
                          詳細
                        </Button>
                      </Link>
                    </div>
                  ))}
                  {wbsList.length > 5 && (
                    <div className="text-center pt-2">
                      <Link href={`/projects/${project.id}/wbs`}>
                        <Button variant="link" size="sm">
                          他 {wbsList.length - 5} 件を表示
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm">WBSがまだ作成されていません</p>
                  <Link href={`/projects/${project.id}/wbs/new`} className="mt-2 inline-block">
                    <Button size="sm" className="gap-2">
                      <Plus className="h-4 w-4" />
                      最初のWBSを作成
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">クイックアクション</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href={`/projects/${project.id}/wbs/new`} className="block">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Plus className="h-4 w-4" />
                  新しいWBSを作成
                </Button>
              </Link>
              <Link href={`/projects/${project.id}/wbs`} className="block">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <FileText className="h-4 w-4" />
                  WBS一覧を表示
                </Button>
              </Link>
              <Link href={`/qqa/${project.id}`} className="block">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <BarChart3 className="h-4 w-4" />
                  定量品質評価
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">プロジェクト統計</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">WBS数</span>
                  <span className="font-medium">{wbsList?.length || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">ステータス</span>
                  <Badge variant={project.status === 'ACTIVE' ? 'default' : 'secondary'}>
                    {project.status}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
