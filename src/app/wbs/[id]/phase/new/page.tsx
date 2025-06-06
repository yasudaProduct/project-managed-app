import { notFound } from "next/navigation";
import { getWbsById } from "@/app/wbs/[id]/wbs-actions";
import { NewWbsPhaseForm } from "./new-wbs-phase-form";

export default async function NewWbsPhasePage({
  params,
}: {
  params: Promise<{ id: number }>;
}) {
  const { id } = await params;

  const wbs = await getWbsById(id);
  if (!wbs) {
    notFound();
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">新規フェーズ作成 - {wbs.name}</h1>
      <NewWbsPhaseForm wbsId={wbs.id} />
    </div>
  );
}
