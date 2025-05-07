import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getUserById } from "@/app/users/user-actions";

export default async function UserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getUserById(id);

  if (!user) {
    notFound();
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">ユーザー詳細</h1>
        <Link href={`/users/${user.id}/edit`}>
          <Button>編集</Button>
        </Link>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{user.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <p>
            <strong>ID:</strong> {user.id}
          </p>
          <p>
            <strong>メールアドレス:</strong> {user.email}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
