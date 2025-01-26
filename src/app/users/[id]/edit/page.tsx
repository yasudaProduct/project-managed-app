import { notFound } from "next/navigation";
import { UserForm } from "@/app/users/user-form";
import { getUserById } from "@/app/users/user-actions";

export default async function EditUserPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getUserById(params.id);

  if (!user) {
    notFound();
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">ユーザー編集</h1>
      <UserForm user={user} />
    </div>
  );
}
