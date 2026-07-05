export const dynamic = 'force-dynamic';

import { ModernCalendar } from "@/components/modern-calendar";
import { getSchedules, getUsers } from "./actions";

export default async function SchedulePage() {
  const [schedules, users] = await Promise.all([
    getSchedules(),
    getUsers()
  ]);

  return (
    <div className="h-[calc(100vh-4rem)]">
      <ModernCalendar schedules={schedules} users={users} />
    </div>
  );
}
