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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createProject, updateProject } from "./project-actions";
import { ProjectStatus } from "@prisma/client";
import { formatDateyyyymmdd } from "@/lib/utils";

const formSchema = z.object({
  name: z.string().min(1, {
    message: "プロジェクト名を入力して下さい",
  }),
  description: z.string().max(100, {
    message: "説明は100文字以下で入力してください。",
  }),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
    message: "開始日は YYYY-MM-DD 形式で入力してください。",
  }),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
    message: "終了予定日は YYYY-MM-DD 形式で入力してください。",
  }),
  status: z.nativeEnum(ProjectStatus),
});

type ProjectFormProps = {
  project?: {
    id: string;
    name: string;
    description?: string;
    startDate: string;
    endDate: string;
    status: ProjectStatus;
  };
};

export function ProjectForm({ project }: ProjectFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  console.log("ProjectForm project:", project);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: project
      ? {
          ...project,
          startDate: formatDateyyyymmdd(project.startDate),
          endDate: formatDateyyyymmdd(project.endDate),
        }
      : {
          name: "",
          description: "",
          startDate: "",
          endDate: "",
          status: ProjectStatus.INACTIVE,
        },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      if (project) {
        const { project: updatedProject } = await updateProject(
          project.id,
          values
        );
        router.push(`/projects/${updatedProject.id}`);
      } else {
        const { project: newProject } = await createProject(values);
        router.push(`/projects/${newProject.id}`);
      }
      router.refresh();
    } catch (error) {
      console.error("Failed to save project:", error);
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
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>ステータス</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="ステータスを選択" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="INACTIVE">計画中</SelectItem>
                  <SelectItem value="ACTIVE">進行中</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? "保存中..."
            : project
            ? "プロジェクトを更新"
            : "プロジェクトを作成"}
        </Button>
      </form>
    </Form>
  );
}
