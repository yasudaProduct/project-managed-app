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

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = await params;

  const project = await getProjectById(projectId);

  if (!project) {
    notFound();
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">{project.name}</h1>
        <Link href={`/projects/${project.id}/edit`}>
          <Button>編集</Button>
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
