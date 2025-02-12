import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { getProjectAll } from "./projects/project-actions";
import { Project } from "@/types/project";

// プロジェクト一覧を取得
const projects: Project[] | null = await getProjectAll();

export default function Home() {
  return (
    <div className="flex min-h-screen bg-gray-100">
      <main className="flex-1 p-2">
        <h1 className="text-3xl ml-12 font-bold mb-6">プロジェクト一覧</h1>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects ? 
          projects.map((project) => (
            <Card key={project.id} className="hover:shadow-lg">
              <Link
                href={`/projects/${project.id}`}
                className="block hover:opacity-80"
              >
                <CardHeader>
                  <CardTitle>{project.name}</CardTitle>
                  <CardDescription>
                    ステータス: {project.status}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p>{project.description}</p>
                </CardContent>
              </Link>
            </Card>
          ))
          :"プロジェクトがありません。"
          }
        </div>
      </main>
    </div>
  );
}
