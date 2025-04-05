import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { getProjectAll } from "./projects/project-actions";
import { Project } from "@/types/project";

export default async function Home() {
  const projects: Project[] | null = await getProjectAll();
  return (
    <div className="flex min-h-screen bg-gray-100">
      <main className="flex-1 p-2">
        <h1 className="text-3xl ml-12 font-bold mb-6">プロジェクト一覧</h1>
        <div className="">
          {projects
            ? projects.map((project) => (
                <Card key={project.id} className="rounded-none hover:shadow-lg">
                  <Link
                    href={`/projects/${project.id}`}
                    className="block hover:opacity-80"
                  >
                    <CardHeader>
                      <CardTitle>{project.name}</CardTitle>
                      <CardDescription></CardDescription>
                    </CardHeader>
                    <CardContent>
                      ステータス: {project.status}
                      <br />
                      開始日: {project.startDate.toLocaleDateString()}
                      <br />
                      終了日: {project.endDate.toLocaleDateString()}
                    </CardContent>
                  </Link>
                </Card>
              ))
            : "プロジェクトがありません。"}
        </div>
      </main>
    </div>
  );
}
