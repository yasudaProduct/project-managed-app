"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import * as z from "zod";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import type { OutlookCalendarRowDto } from "@/types/outlook-calendar";
import { importOutlookSchedule } from "../../actions";
import { FileDropZone } from "./file-drop-zone";
import { matchUserByFileName, type FileNameMatchUser } from "./match-user-by-file-name";
import { parseOutlookCalendarCsv } from "./outlook-csv";
import { OutlookImportResults, type OutlookFileImportOutcome } from "./outlook-import-result";
import { readFileAsText } from "./read-file-as-text";

const SEND_FAILED_MESSAGE = "送信に失敗しました。ファイルが大きい場合は期間を分けてエクスポートしてください。";

// クライアント側の検証はUX目的。境界防御はServer Action側で再検証する。
const pendingFileSchema = z.object({
  fileName: z.string(),
  rows: z.array(z.custom<OutlookCalendarRowDto>()),
  /** ファイルを読み込めなかった理由 */
  parseError: z.string().optional(),
  userId: z.string(),
  /** 取り込み先ユーザーの推定結果の説明 */
  matchNote: z.string().optional(),
});

const formSchema = z
  .object({ files: z.array(pendingFileSchema) })
  .superRefine(({ files }, ctx) => {
    if (files.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["files"], message: "取り込むファイルを追加してください" });
      return;
    }
    if (files.some((file) => file.parseError)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["files"],
        message: "読み込めないファイルを一覧から外してください",
      });
    }

    const fileCountByUserId = new Map<string, number>();
    for (const file of files) {
      if (file.userId) fileCountByUserId.set(file.userId, (fileCountByUserId.get(file.userId) ?? 0) + 1);
    }
    files.forEach((file, index) => {
      if (file.parseError) return;
      if (!file.userId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["files", index, "userId"],
          message: "取り込み先のユーザーを選択してください",
        });
      } else if ((fileCountByUserId.get(file.userId) ?? 0) > 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["files", index, "userId"],
          message: "同じユーザーが複数のファイルに割り当てられています",
        });
      }
    });
  });

type FormValues = z.infer<typeof formSchema>;
type PendingFile = FormValues["files"][number];

type OutlookImportFormProps = {
  users: FileNameMatchUser[];
};

async function loadPendingFile(file: File, users: ReadonlyArray<FileNameMatchUser>): Promise<PendingFile> {
  let parsed: ReturnType<typeof parseOutlookCalendarCsv>;
  try {
    parsed = parseOutlookCalendarCsv(await readFileAsText(file));
  } catch {
    parsed = { success: false, error: "ファイルを読み込めませんでした" };
  }
  if (!parsed.success) {
    return { fileName: file.name, rows: [], parseError: parsed.error, userId: "" };
  }

  const match = matchUserByFileName(file.name, users);
  const userNameOf = (userId: string) => users.find((user) => user.id === userId)?.name ?? userId;
  if (match.status === "matched") {
    return { fileName: file.name, rows: parsed.rows, userId: match.userId, matchNote: "ファイル名から選択" };
  }
  return {
    fileName: file.name,
    rows: parsed.rows,
    userId: "",
    matchNote:
      match.status === "ambiguous"
        ? `候補が複数あります（${match.userIds.map(userNameOf).join("、")}）`
        : undefined,
  };
}

export function OutlookImportForm({ users }: OutlookImportFormProps) {
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [outcomes, setOutcomes] = useState<OutlookFileImportOutcome[] | null>(null);
  const isImporting = progress !== null;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { files: [] },
  });
  const { fields, append, update, remove } = useFieldArray({ control: form.control, name: "files" });

  const userNameOf = (userId: string) => users.find((user) => user.id === userId)?.name ?? "";

  const revalidateIfSubmitted = () => {
    if (form.formState.isSubmitted) void form.trigger("files");
  };

  async function handleFilesSelect(files: File[]) {
    const loadedFiles = await Promise.all(files.map((file) => loadPendingFile(file, users)));
    for (const loadedFile of loadedFiles) {
      // 同じ名前のファイルは追加し直しとみなして置き換える
      const existingIndex = form.getValues("files").findIndex((file) => file.fileName === loadedFile.fileName);
      if (existingIndex >= 0) {
        update(existingIndex, loadedFile);
      } else {
        append(loadedFile);
      }
    }
    revalidateIfSubmitted();
  }

  async function onSubmit({ files }: FormValues) {
    setOutcomes(null);
    const importOutcomes: OutlookFileImportOutcome[] = [];

    // 1リクエスト1ファイルにして、本文サイズの上限と失敗の影響範囲をファイル単位に抑える
    for (const [index, file] of files.entries()) {
      setProgress({ done: index, total: files.length });
      const userName = userNameOf(file.userId);
      try {
        const result = await importOutlookSchedule({ userId: file.userId, rows: file.rows });
        importOutcomes.push({ fileName: file.fileName, userName, result });
      } catch (error) {
        console.error("Outlook schedule import error:", error);
        importOutcomes.push({ fileName: file.fileName, userName, result: { success: false, error: SEND_FAILED_MESSAGE } });
      }
    }
    setProgress(null);
    setOutcomes(importOutcomes);

    // 成功したファイルは一覧から外し、失敗したファイルは再試行できるよう残す
    const failedFileNames = new Set(
      importOutcomes.filter((outcome) => !outcome.result.success).map((outcome) => outcome.fileName)
    );
    form.reset({ files: files.filter((file) => failedFileNames.has(file.fileName)) });

    const successCount = importOutcomes.length - failedFileNames.size;
    if (failedFileNames.size === 0) {
      toast({ title: "スケジュールをインポートしました", description: `${successCount}件のファイルを取り込みました` });
    } else {
      toast({
        title: successCount === 0 ? "スケジュールのインポートに失敗しました" : "一部のファイルを取り込めませんでした",
        description: `成功 ${successCount}件・失敗 ${failedFileNames.size}件`,
        variant: "destructive",
      });
    }
  }

  const filesError = form.formState.errors.files;
  const listErrorMessage = filesError?.root?.message ?? filesError?.message;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Outlook の予定表を取り込む</CardTitle>
          <CardDescription>
            担当者ごとにエクスポートした予定表（CSV）をまとめて取り込めます。取り込み先ユーザーはファイル名（個人コードまたは氏名）から自動で選ばれます。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FileDropZone
                accept=".csv"
                multiple
                inputLabel="Outlookの予定表CSVファイル"
                formatDescription="対応形式: .csv（Outlook の予定表エクスポート。Shift_JIS / UTF-8）。複数ファイルをまとめて選択できます"
                isLoading={isImporting}
                onFilesSelect={handleFilesSelect}
              />

              {fields.length > 0 && (
                <Table aria-label="取り込むファイル">
                  <TableHeader>
                    <TableRow>
                      <TableHead>ファイル</TableHead>
                      <TableHead>内容</TableHead>
                      <TableHead>取り込み先ユーザー</TableHead>
                      <TableHead className="w-12">
                        <span className="sr-only">操作</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((pendingFile, index) => (
                      <TableRow key={pendingFile.id}>
                        <TableCell className="font-medium align-top">{pendingFile.fileName}</TableCell>
                        <TableCell className="align-top">
                          {pendingFile.parseError ? (
                            <span className="text-destructive">{pendingFile.parseError}</span>
                          ) : (
                            <span>{pendingFile.rows.length}件の予定</span>
                          )}
                        </TableCell>
                        <TableCell className="align-top">
                          {pendingFile.parseError ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            <FormField
                              control={form.control}
                              name={`files.${index}.userId`}
                              render={({ field }) => (
                                <FormItem className="space-y-1">
                                  <Select
                                    value={field.value}
                                    disabled={isImporting}
                                    onValueChange={(value) => {
                                      field.onChange(value);
                                      revalidateIfSubmitted();
                                    }}
                                  >
                                    <FormControl>
                                      <SelectTrigger
                                        className="w-full sm:w-64"
                                        aria-label={`${pendingFile.fileName} の取り込み先ユーザー`}
                                      >
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
                                  {pendingFile.matchNote && (
                                    <p className="text-xs text-muted-foreground">{pendingFile.matchNote}</p>
                                  )}
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}
                        </TableCell>
                        <TableCell className="align-top">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={isImporting}
                            aria-label={`${pendingFile.fileName} を一覧から外す`}
                            onClick={() => {
                              remove(index);
                              revalidateIfSubmitted();
                            }}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {listErrorMessage && <p className="text-sm font-medium text-destructive">{listErrorMessage}</p>}

              <Button type="submit" disabled={isImporting}>
                {progress ? `インポート中...（${progress.done + 1}/${progress.total}）` : "インポート"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {outcomes && <OutlookImportResults outcomes={outcomes} />}

      <OutlookExportGuide />
    </div>
  );
}

function OutlookExportGuide() {
  return (
    <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600 space-y-3">
      <div>
        <h3 className="font-medium text-gray-900 mb-1">Outlook からのエクスポート手順（クラシック版 Outlook。担当者ごとに実施）</h3>
        <ol className="list-decimal pl-5 space-y-1">
          <li>「ファイル」→「開く/エクスポート」→「インポート/エクスポート」を選択</li>
          <li>「ファイルにエクスポート」→「テキスト ファイル (コンマ区切り)」を選択</li>
          <li>
            エクスポートする「予定表」フォルダーを選び、ファイル名を<strong>個人コードまたは氏名</strong>
            にして保存先を指定し「完了」（例: 12345.csv、山田太郎.csv）
          </li>
          <li>表示される期間の指定で、取り込みたい期間を指定（定期的な予定も1件ずつ出力されます）</li>
        </ol>
      </div>
      <div>
        <h3 className="font-medium text-gray-900 mb-1">取り込みのルール</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            ファイルごとに、取り込み先ユーザーの、ファイル内の予定の期間（最初の予定の日〜最後の予定の日）のスケジュールを置き換えます。他のユーザーや期間外のスケジュールは変更しません。
          </li>
          <li>1人のユーザーに割り当てられるファイルは1つまでです。</li>
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
