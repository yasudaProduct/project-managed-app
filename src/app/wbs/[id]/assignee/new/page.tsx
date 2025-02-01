import { NewWbsAssigneeForm } from "@/components/wbs/new-wbs-assignee-form";

export default async function NewWbsAssigneePage({
  params,
}: {
  params: Promise<{ id: number }>;
}) {
  const { id } = await params;
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">担当者を追加</h1>
      <NewWbsAssigneeForm wbsId={id} />
    </div>
  );
}
