import { GlobalSettingsForm } from '@/components/settings/GlobalSettingsForm';

export default async function SettingsPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">プロジェクト全体設定</h1>
      <GlobalSettingsForm />
    </div>
  );
}