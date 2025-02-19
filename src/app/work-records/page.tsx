import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import { columns } from "@/app/work-records/columns";
import { getWorkRecords } from "./work-recods-acton";

export default async function WorkRecordsPage() {
  const workRecords = await getWorkRecords();

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">作業実績</h1>
        <Link href="/work-records/new">
          <Button>新規作業実績入力</Button>
        </Link>
      </div>
      <DataTable columns={columns} data={workRecords} />
    </div>
  );
}
