import { NewWbsAssigneeForm } from "@/components/wbs/new-wbs-assignee-form";
import { notFound } from "next/navigation";
import { getWbsAssigneeById } from "../../assignee-actions";

export default async function EditWbsAssigneePage({
  params,
}: {
  params: Promise<{ id: number }>;
}) {
  const { id } = await params;
  const assignee = await getWbsAssigneeById(Number(id));

  if (!assignee) {
    notFound();
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">担当者を編集</h1>
      <NewWbsAssigneeForm
        wbsId={assignee.wbsId}
        assignee={{
          id: assignee.id,
          assigneeId: assignee.assigneeId,
          name: assignee.assignee.name,
          rate: assignee.rate,
        }}
      />
    </div>
  );
}
