import { UserScheduleCalendar } from "@/components/user-schedule-calendar";
import { getSchedules } from "./action";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import Link from "next/link";

export default async function SchedulePage() {
  const schedules = await getSchedules();

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">スケジュール</h1>
        <Link href="/schedule/import">
          <Button>
            <PlusIcon className="w-4 h-4" />
            スケジュール追加
          </Button>
        </Link>
      </div>
      <UserScheduleCalendar schedules={schedules} />
    </div>
  );
}
