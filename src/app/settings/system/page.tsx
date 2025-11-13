import { SystemSettingsForm } from "@/components/settings/system-settings-form";

export default function SystemSettingsPage() {
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">システム設定</h1>
        <p className="text-gray-500 mt-2">
          システム全体で使用される基本設定を管理します
        </p>
      </div>

      <SystemSettingsForm />
    </div>
  );
}
