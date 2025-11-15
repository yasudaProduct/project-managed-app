import { WbsAssigneeForm } from "@/components/wbs/wbs-assignee-form";
import { notFound } from "next/navigation";
import { getWbsAssigneeById } from "../../assignee-actions";

export default async function EditWbsAssigneePage({
  params,
}: {
  params: Promise<{ id: number }>;
}) {
  const { id } = await params;
  const assignee = await getWbsAssigneeById(Number(id));

  if (!assignee.assignee) {
    notFound();
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">担当者を編集</h1>
      <WbsAssigneeForm
        wbsId={assignee.wbsId!}
        assignee={{
          id: assignee.assignee.id,
          assigneeId: assignee.assignee.userId,
          name: assignee.assignee.name,
          rate: assignee.assignee.rate,
          costPerHour: assignee.assignee.costPerHour,
          seq: assignee.assignee.seq,
        }}
      />
    </div>
  );
}
