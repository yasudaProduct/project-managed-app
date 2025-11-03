"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/date-picker";

type CompanyHolidayType = "NATIONAL" | "COMPANY" | "SPECIAL";

interface CompanyHoliday {
  id: number;
  date: string;
  name: string;
  type: CompanyHolidayType;
  createdAt: string;
  updatedAt: string;
}

interface CompanyHolidayFormProps {
  holiday?: CompanyHoliday | null;
  onClose: () => void;
  onSaveSuccess: () => void;
}

// バリデーションスキーマ（DatePickerに合わせて文字列 YYYY/MM/DD を受け付け）
const formSchema = z.object({
  date: z
    .string({ required_error: "日付を選択してください" })
    .regex(/^\d{4}\/\d{2}\/\d{2}$/u, "日付はYYYY/MM/DD形式で入力してください"),
  name: z
    .string()
    .min(1, "休日名を入力してください")
    .max(100, "休日名は100文字以内で入力してください"),
  type: z.enum(["NATIONAL", "COMPANY", "SPECIAL"], {
    required_error: "休日の種類を選択してください",
  }),
});

type FormData = z.infer<typeof formSchema>;

export function CompanyHolidayForm({
  holiday,
  onClose,
  onSaveSuccess,
}: CompanyHolidayFormProps) {
  const [loading, setLoading] = useState(false);
  // DatePicker 使用のため個別のカレンダー開閉状態は不要

  const isEditing = !!holiday;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: holiday ? holiday.date.replace(/-/g, "/") : "",
      name: holiday?.name || "",
      type: holiday?.type || "COMPANY",
    },
  });

  // 休日タイプの選択肢
  const holidayTypes = [
    { value: "NATIONAL", label: "国民の祝日" },
    { value: "COMPANY", label: "会社休日" },
    { value: "SPECIAL", label: "特別休日" },
  ] as const;

  // フォーム送信処理
  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);

      // TODO: server actionに移行
      const url = isEditing
        ? `/api/company-holidays/${holiday.id}`
        : "/api/company-holidays";

      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          date: data.date.replace(/\//g, "-"),
          name: data.name,
          type: data.type,
        }),
      });

      if (response.ok) {
        onSaveSuccess();
      } else {
        const errorData = await response.json();
        alert(errorData.message || "保存に失敗しました");
      }
    } catch (error) {
      console.error("保存中にエラーが発生しました:", error);
      alert("保存中にエラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "会社休日の編集" : "会社休日の新規追加"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "会社休日の情報を編集します。"
              : "新しい会社休日を追加します。営業日案分計算に反映されます。"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* 日付選択 */}
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>日付 *</FormLabel>
                  <DatePicker field={field} />
                  <FormDescription>
                    休日として設定する日付を選択してください
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 休日名 */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>休日名 *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="例: 年末特別休暇"
                      {...field}
                      maxLength={100}
                    />
                  </FormControl>
                  <FormDescription>
                    休日の名称を入力してください（100文字以内）
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 休日の種類 */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>種類 *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="休日の種類を選択" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {holidayTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    休日の分類を選択してください
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* ボタン */}
            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                キャンセル
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "保存中..." : isEditing ? "更新" : "追加"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
