"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import type { OutlookScheduleImportSummaryDto } from "@/types/outlook-calendar";
import { importOutlookSchedule } from "../../actions";
import { FileDropZone } from "./file-drop-zone";
import { parseOutlookCalendarCsv } from "./outlook-csv";
import { OutlookImportResult } from "./outlook-import-result";
import { readFileAsText } from "./read-file-as-text";

// クライアント側の検証はUX目的。境界防御はServer Action側で再検証する。
const formSchema = z.object({
  userId: z.string().min(1, "取り込み先のユーザーを選択してください"),
  file: z.custom<File>((value) => typeof File !== "undefined" && value instanceof File, {
    message: "ファイルを選択してください",
  }),
});

type FormValues = z.infer<typeof formSchema>;

type OutlookImportFormProps = {
  users: { id: string; name: string; email: string }[];
};

const IMPORT_FAILED_TITLE = "スケジュールのインポートに失敗しました";

export function OutlookImportForm({ users }: OutlookImportFormProps) {
  const [isImporting, setIsImporting] = useState(false);
  const [lastImport, setLastImport] = useState<{
    userName: string;
    summary: OutlookScheduleImportSummaryDto;
  } | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { userId: "", file: undefined },
  });

  const notifyFailure = (description: string) => {
    toast({ title: IMPORT_FAILED_TITLE, description, variant: "destructive" });
  };

  async function onSubmit(values: FormValues) {
    setIsImporting(true);
    setLastImport(null);
    try {
      const parsed = parseOutlookCalendarCsv(await readFileAsText(values.file));
      if (!parsed.success) {
        notifyFailure(parsed.error);
        return;
      }

      const result = await importOutlookSchedule({ userId: values.userId, rows: parsed.rows });
      if (!result.success) {
        notifyFailure(result.error);
        return;
      }

      const userName = users.find((user) => user.id === values.userId)?.name ?? "";
      setLastImport({ userName, summary: result.data });
      toast({
        title: "スケジュールをインポートしました",
        description: `${userName} さんの予定を${result.data.importedEventCount}件取り込みました`,
      });
    } catch (error) {
      console.error("Outlook schedule import error:", error);
      notifyFailure(
        "ファイルの読み込みまたは送信に失敗しました。ファイルが大きい場合は期間を分けてエクスポートしてください。"
      );
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Outlook の予定表を取り込む</CardTitle>
          <CardDescription>
            Outlook からエクスポートした予定表（CSV）を、選択したユーザーのスケジュールとして取り込みます。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="userId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>取り込み先ユーザー</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isImporting}>
                      <FormControl>
                        <SelectTrigger className="w-full sm:w-80">
                          <SelectValue placeholder="ユーザーを選択" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="file"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>予定表ファイル</FormLabel>
                    <FileDropZone
                      accept=".csv"
                      inputLabel="Outlookの予定表CSVファイル"
                      formatDescription="対応形式: .csv（Outlook の予定表エクスポート。Shift_JIS / UTF-8）"
                      selectedFileName={field.value?.name}
                      isLoading={isImporting}
                      onFileSelect={(file) => field.onChange(file)}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={isImporting}>
                {isImporting ? "インポート中..." : "インポート"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {lastImport && <OutlookImportResult userName={lastImport.userName} summary={lastImport.summary} />}

      <OutlookExportGuide />
    </div>
  );
}

function OutlookExportGuide() {
  return (
    <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600 space-y-3">
      <div>
        <h3 className="font-medium text-gray-900 mb-1">Outlook からのエクスポート手順（クラシック版 Outlook）</h3>
        <ol className="list-decimal pl-5 space-y-1">
          <li>「ファイル」→「開く/エクスポート」→「インポート/エクスポート」を選択</li>
          <li>「ファイルにエクスポート」→「テキスト ファイル (コンマ区切り)」を選択</li>
          <li>エクスポートする「予定表」フォルダーを選び、保存先を指定して「完了」</li>
          <li>表示される期間の指定で、取り込みたい期間を指定（定期的な予定も1件ずつ出力されます）</li>
        </ol>
      </div>
      <div>
        <h3 className="font-medium text-gray-900 mb-1">取り込みのルール</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            選択したユーザーの、ファイル内の予定の期間（最初の予定の日〜最後の予定の日）のスケジュールを置き換えます。他のユーザーや期間外のスケジュールは変更しません。
          </li>
          <li>
            公開方法が「空き時間」「他の場所で作業中」の予定は取り込みません（「休暇」「有給」などの全休の予定は取り込みます）。
          </li>
          <li>終日の予定は 00:00〜24:00、日をまたぐ予定は日ごとに分割して登録します。</li>
          <li>時刻はファイルに書かれた時刻のまま登録します。</li>
        </ul>
      </div>
    </div>
  );
}
