import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import MilestoneManagement from "@/components/milestone/milestone-management";

export default async function MilestonePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const wbsId = parseInt(id);

  if (isNaN(wbsId)) {
    notFound();
  }

  // WBSの存在確認
  const wbs = await prisma.wbs.findUnique({
    where: { id: wbsId },
    select: {
      id: true,
      name: true,
      project: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!wbs) {
    notFound();
  }

  // マイルストーンの取得
  const milestones = await prisma.milestone.findMany({
    where: { wbsId },
    orderBy: { date: "asc" },
  });

  return (
    <div className="container mx-auto py-6">
      <div className="space-y-6">
        {/* ヘッダー */}
        <div>
          <h1 className="text-3xl font-bold">マイルストーン管理</h1>
          <p className="text-muted-foreground">
            プロジェクト: {wbs.project.name} / WBS: {wbs.name}
          </p>
        </div>

        {/* マイルストーン管理コンポーネント */}
        <MilestoneManagement
          wbsId={wbsId}
          initialMilestones={milestones}
        />
      </div>
    </div>
  );
}