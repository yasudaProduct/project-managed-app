import { notFound } from "next/navigation";
import { getWbsById } from "@/app/wbs/[id]/wbs-actions";
import { getWbsPhases } from "@/app/wbs/[id]/wbs-phase-actions";
import { WbsPhaseList } from "@/app/wbs/[id]/wbs-phase-list";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function WbsManagementPage({
  params,
}: {
  params: Promise<{ id: number }>;
}) {
  const { id } = await params;

  const wbs = await getWbsById(id);
  if (!wbs) {
    notFound();
  }

  const phases = await getWbsPhases(wbs.id);

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">WBS管理: {wbs.name}</h1>
        <div className="space-x-4">
          <Link href={`/wbs/${wbs.id}/phase/new`}>
            <Button>新規フェーズ追加</Button>
          </Link>
          <Link href={`/wbs/${wbs.id}/task/new`}>
            <Button variant="outline">新規タスク追加</Button>
          </Link>
        </div>
      </div>
      <WbsPhaseList wbsId={wbs.id} phases={phases} />
    </div>
  );
}
