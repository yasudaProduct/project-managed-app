import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import { getWbsPhases } from "../wbs-phase-actions";
import { columns } from "./columns";

export default async function WbsPhasePage({
  params,
}: {
  params: Promise<{ id: number }>;
}) {
  const { id } = await params;
  const phases = await getWbsPhases(Number(id));

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">フェーズ一覧</h1>
        <Link href={`/wbs/${id}/phase/new`}>
          <Button>新規フェーズ作成</Button>
        </Link>
      </div>
      <DataTable columns={columns} data={phases} />
    </div>
  );
}
