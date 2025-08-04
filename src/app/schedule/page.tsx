import { ModernCalendar } from "@/components/modern-calendar";
import { getSchedules, getUsers } from "./action";

export default async function SchedulePage() {
  const [schedules, users] = await Promise.all([
    getSchedules(),
    getUsers()
  ]);

  return (
    <div className="h-screen">
      <ModernCalendar schedules={schedules} users={users} />
    </div>
  );
}
