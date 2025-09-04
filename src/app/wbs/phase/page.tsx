import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import { getPhaseTemplates } from "./phase-actions";
import { columns } from "./columns";

export default async function PhasePage() {
  const phases = await getPhaseTemplates();

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">工程テンプレート一覧</h1>
        <Link href="/wbs/phase/new">
          <Button>新規工程テンプレート作成</Button>
        </Link>
      </div>
      <DataTable
        columns={columns}
        data={
          phases?.map((phase) => ({
            ...phase,
            link: `/wbs/phase/${phase.id}`,
          })) ?? []
        }
      />
    </div>
  );
}
