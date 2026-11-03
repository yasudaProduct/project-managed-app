export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getUsers } from "../actions";
import { OutlookImportForm } from "./_components/outlook-import-form";
import { TsvImportForm } from "./_components/tsv-import-form";

export default async function ScheduleImportPage() {
  const users = await getUsers();

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/schedule">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            カレンダーへ戻る
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">スケジュールインポート</h1>
      </div>

      <Tabs defaultValue="outlook">
        <TabsList>
          <TabsTrigger value="outlook">Outlook（CSV）</TabsTrigger>
          <TabsTrigger value="tsv">従来形式（TSV）</TabsTrigger>
        </TabsList>
        <TabsContent value="outlook" className="mt-6">
          <OutlookImportForm users={users} />
        </TabsContent>
        <TabsContent value="tsv" className="mt-6">
          <TsvImportForm />
        </TabsContent>
      </Tabs>
    </div>
  );
}
