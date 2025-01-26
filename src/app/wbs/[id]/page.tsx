import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getWbsById } from "@/app/wbs/[id]/wbs-actions";
import { getWbsPhases } from "@/app/wbs/[id]/wbs-phase-actions";
import { WbsManagement } from "@/components/wbs/wbs-management";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Loader2 } from "lucide-react";

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
        <Link href={`/wbs/${wbs.id}/phase/new`}>
          <Button>新規フェーズ追加</Button>
        </Link>
      </div>
      <Suspense
        fallback={
          <div className="flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        }
      >
        <WbsManagement wbsId={wbs.id} initialPhases={phases} />
      </Suspense>
    </div>
  );
}
