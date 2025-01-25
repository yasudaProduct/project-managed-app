"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createProject } from "./project-actions";

const formSchema = z.object({
  name: z.string().min(2, {
    message: "プロジェクト名は2文字以上で入力してください。",
  }),
  description: z.string().min(10, {
    message: "説明は10文字以上で入力してください。",
  }),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
    message: "開始日は YYYY-MM-DD 形式で入力してください。",
  }),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
    message: "終了予定日は YYYY-MM-DD 形式で入力してください。",
  }),
});

export function NewProjectForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      startDate: "",
      endDate: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      await createProject(values);
      router.push("/projects");
      router.refresh();
    } catch (error) {
      console.error("Failed to create project:", error);
      // エラーハンドリングをここに追加（例：エラーメッセージの表示）
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>プロジェクト名</FormLabel>
              <FormControl>
                <Input placeholder="新規プロジェクト" {...field} />
              </FormControl>
              <FormDescription>
                プロジェクトの名前を入力してください。
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>説明</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="プロジェクトの詳細な説明を入力してください。"
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                プロジェクトの目的や概要を記述してください。
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="startDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>開始日</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="endDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>終了予定日</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "作成中..." : "プロジェクトを作成"}
        </Button>
      </form>
    </Form>
  );
}
