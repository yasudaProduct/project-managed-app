"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { parse } from "csv-parse/sync";
import { useState } from "react";
import { importSchedule } from "../action";

export default function ScheduleImportPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsLoading(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result;
        const csv = parse(text as string, {
          columns: true,
          skip_empty_lines: true,
        });
        const { success, error } = await importSchedule(csv);

        if (success) {
          setIsLoading(false);
          toast({
            title: "スケジュールのインポートに成功しました",
            description: "スケジュールをインポートしました",
          });
          router.push("/schedule");
        } else {
          toast({
            title: "スケジュールのインポートに失敗しました",
            description: error,
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error(error);
        toast({
          title: "スケジュールのインポートに失敗しました",
          description: "スケジュールのインポートに失敗しました",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsText(files[0]);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold">スケジュールインポート</h1>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label>ファイルを選択</Label>
          <Input
            type="file"
            onChange={handleFileChange}
            disabled={isLoading}
            accept=".csv"
          />
        </div>
      </div>
    </div>
  );
}
