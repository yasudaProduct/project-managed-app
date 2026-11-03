export const dynamic = 'force-dynamic';

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getUsers } from "../actions";
import { FreeTimeSearch } from "./_components/free-time-search";

export default async function FreeTimeSearchPage() {
  const users = await getUsers();

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/schedule">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            カレンダーへ戻る
          </Button>
        </Link>
        <h1 className="text-2xl font-semibold">共通空き時間検索</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        指定したユーザー全員が空いている時間帯を検索します（対象時間帯
        09:00〜18:00。土日・祝日・会社休日は除外されます）。条件はすべて任意指定です。
      </p>
      <FreeTimeSearch users={users} />
    </div>
  );
}
