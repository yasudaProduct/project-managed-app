import { notFound, redirect } from "next/navigation";
import { getProjectById } from "../../project-actions";
import { getLatestWbsByProjectId } from "../wbs/wbs-actions";

export default async function ProjectAssigneePage({
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
    redirect(`/projects/${projectId}`);
  }

  // 現在のWBS詳細ページの担当者タブにリダイレクト（暫定）
  redirect(`/wbs/${latestWbs.id}/assignee`);
}