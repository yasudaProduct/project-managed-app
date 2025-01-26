import { notFound } from "next/navigation";
import { PhaseForm } from "@/app/wbs/phase/phase.form";
import { getPhaseById } from "@/app/wbs/phase/phase-actions";

export default async function EditPhasePage({
  params,
}: {
  params: Promise<{ id: number }>;
}) {
  const { id } = await params;

  const phase = await getPhaseById(id);

  if (!phase) {
    notFound();
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">工程編集</h1>
      <PhaseForm phase={phase} />
    </div>
  );
}
