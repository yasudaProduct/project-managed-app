export const dynamic = "force-dynamic";

import { SystemSettingsForm } from "@/components/settings/system-settings-form";
import { getImportScheduleOverview } from "./import-schedule-actions";
import { ImportScheduleOverview } from "./_components/import-schedule-overview";

export default async function SystemSettingsPage() {
  const importSchedule = await getImportScheduleOverview();

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">システム設定</h1>
        <p className="text-gray-500 mt-2">
          システム全体で使用される基本設定を管理します
        </p>
      </div>

      <div className="max-w-4xl">
        <SystemSettingsForm />
      </div>

      <ImportScheduleOverview
        settings={importSchedule.settings}
        schedules={importSchedule.schedules}
      />
    </div>
  );
}
