import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import { getWbsAssignees } from "../wbs-assignee-actions";
import { columns } from "./columns";

export default async function WbsAssigneePage({
  params,
}: {
  params: Promise<{ id: number }>;
}) {
  const { id } = await params;
  const assignees = await getWbsAssignees(Number(id));

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">担当者一覧</h1>
        <Link href={`/wbs/${id}/assignee/new`}>
          <Button>新規担当者作成</Button>
        </Link>
      </div>
      <DataTable
        columns={columns}
        data={
          assignees?.map((assignee) => ({
            ...assignee,
            link: `/wbs/assignee/${assignee.id}/edit`,
          })) ?? []
        }
      />
    </div>
  );
}
