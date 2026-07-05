"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
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
  getSystemSettings,
  updateSystemSettings,
} from "@/app/settings/system/system-settings-actions";
import { useToast } from "@/hooks/use-toast";

// 数値入力は string で受け、送信時に数値へ変換する
const formSchema = z.object({
  standardWorkingHours: z
    .string()
    .refine(
      (v) => v !== "" && !isNaN(Number(v)) && Number(v) > 0,
      "基本稼働時間は正の数値を入力してください"
    ),
  defaultUserCostPerHour: z
    .string()
    .refine(
      (v) => v === "" || (!isNaN(Number(v)) && Number(v) >= 0),
      "デフォルト人員原価は0以上の数値を入力してください"
    ),
});

export function SystemSettingsForm() {
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { standardWorkingHours: "7.5", defaultUserCostPerHour: "" },
  });

  useEffect(() => {
    (async () => {
      try {
        const data = await getSystemSettings();
        form.reset({
          standardWorkingHours: data.standardWorkingHours.toString(),
          defaultUserCostPerHour:
            data.defaultUserCostPerHour?.toString() ?? "",
        });
      } catch {
        toast({
          variant: "destructive",
          title: "エラー",
          description: "設定の読み込みに失敗しました",
        });
      }
    })();
  }, [toast, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const hours = Number(values.standardWorkingHours);
    const cost =
      values.defaultUserCostPerHour === ""
        ? null
        : Number(values.defaultUserCostPerHour);

    try {
      const result = await updateSystemSettings(hours, cost);
      if (!result.success) {
        toast({
          variant: "destructive",
          title: "保存失敗",
          description: result.error,
        });
        return;
      }
      toast({
        title: "保存成功",
        description: "システム設定を保存しました",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "保存失敗",
        description:
          error instanceof Error ? error.message : "設定の保存に失敗しました",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">システム設定</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6"
          >
            <FormField
              control={form.control}
              name="standardWorkingHours"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-medium">
                    基本稼働時間（時間/日）
                  </FormLabel>
                  <FormDescription>
                    1日あたりの標準的な稼働時間を設定します。スケジュール計算や工数計算に使用されます。
                  </FormDescription>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.5"
                      min="0"
                      placeholder="7.5"
                      className="max-w-xs"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="defaultUserCostPerHour"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-medium">
                    デフォルト人員原価（円/時間）
                  </FormLabel>
                  <FormDescription>
                    時間単位のデフォルト人員原価を設定します。プロジェクトコスト計算の参考値として使用されます。
                  </FormDescription>
                  <FormControl>
                    <Input
                      type="number"
                      step="100"
                      min="0"
                      placeholder="例: 5000"
                      className="max-w-xs"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-start">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "保存中..." : "保存"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
