import { DataTable } from "@/components/data-table";
import { columns } from "@/app/work-records/columns";
import { getWorkRecords } from "./actions";

export default async function WorkRecordsPage() {
  const workRecords = await getWorkRecords();

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">作業実績</h1>
      </div>
      <DataTable
        columns={columns}
        data={workRecords?.map((workRecord) => ({
          ...workRecord,
          link: undefined,
        }))}
      />
    </div>
  );
}
