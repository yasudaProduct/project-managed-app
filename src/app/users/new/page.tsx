import { UserForm } from "../user-form";

export default function NewUserPage() {
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">新規ユーザー作成</h1>
      <UserForm />
    </div>
  );
}
