import { SideMenu } from "@/components/side-menu";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// モックデータ
const projects = [
  { id: 1, name: "ウェブサイトリニューアル", status: "進行中" },
  { id: 2, name: "モバイルアプリ開発", status: "計画中" },
  { id: 3, name: "データ分析プロジェクト", status: "完了" },
];

export default function Home() {
  return (
    <div className="flex min-h-screen bg-gray-100">
      <SideMenu />
      <main className="flex-1 p-6">
        <h1 className="text-3xl ml-12 font-bold mb-6">プロジェクト一覧</h1>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card key={project.id}>
              <CardHeader>
                <CardTitle>{project.name}</CardTitle>
                <CardDescription>ステータス: {project.status}</CardDescription>
              </CardHeader>
              <CardContent>
                <p>プロジェクトの詳細情報がここに表示されます。</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
