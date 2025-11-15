import { getSystemSettings } from "@/app/settings/system/system-settings-actions";
import { UserForm } from "../user-form";

export default async function NewUserPage() {
  const { defaultUserCostPerHour } = await getSystemSettings();

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">新規ユーザー作成</h1>
      <UserForm
        systemSettings={{ defaultCostPerHour: defaultUserCostPerHour }}
      />
    </div>
  );
}
