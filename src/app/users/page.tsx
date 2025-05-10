import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getUsers } from "@/app/users/user-actions";
import { DataTable } from "@/components/data-table";
import { columns } from "@/app/users/columns";

export default async function UsersPage() {
  const users = await getUsers();

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">ユーザー一覧</h1>
        <Link href="/users/new">
          <Button>新規ユーザー作成</Button>
        </Link>
      </div>
      <DataTable
        columns={columns}
        data={users?.map((user) => ({
          ...user,
          link: `/users/${user.id}`,
        }))}
      />
    </div>
  );
}
