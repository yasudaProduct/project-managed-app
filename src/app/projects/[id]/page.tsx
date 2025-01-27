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
import { getProjectById } from "../project-actions";
import { getWbsByProjectId } from "./wbs/wbs-actions";

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
    <div className="container mx-auto py-10">
      <div className="flex justify-between items- mb-6">
        <h1 className="text-3xl font-bold">{project.name}</h1>
        <Link href={`/projects/${project.id}/edit`}>
          <Button>編集</Button>
        </Link>
        <Link href={`/projects/${project.id}/wbs/new`}>
          <Button>WBS作成</Button>
        </Link>
        <Link href={`/qqa/${project.id}`}>
          <Button variant="outline">定量品質評価</Button>
        </Link>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-bold">{project.name}</CardTitle>
          <CardDescription>ステータス: {project.status}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">説明</h3>
              <p>{project.description}</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold">期間</h3>
              <p>開始日: {project.startDate.toLocaleDateString()}</p>
              <p>終了予定日: {project.endDate.toLocaleDateString()}</p>
            </div>
            <h3 className="text-lg font-semibold">WBS</h3>
            <ul>
              {wbsList.map((wbs) => (
                <li key={wbs.id}>
                  <Link
                    href={`/wbs/${wbs.id}`}
                    className="text-blue-500 hover:underline"
                  >
                    {wbs.name}
                  </Link>
                </li>
              ))}
            </ul>
            <Link href={`/projects/${project.id}/wbs`}>
              <Button variant="link">WBS一覧を見る</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
