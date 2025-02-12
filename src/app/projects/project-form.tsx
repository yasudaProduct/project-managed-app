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
import { createProject, deleteProject, updateProject } from "./project-actions";
import { ProjectStatus } from "@prisma/client";
import { formatDateyyyymmdd } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon } from "lucide-react"
import { Calendar } from "@/components/ui/calendar";
import { DatePicker } from "@/components/date-picker";

const formSchema = z.object({
  name: z.string().min(1, {
    message: "プロジェクト名を入力して下さい",
  }),
  description: z.string().max(100, {
    message: "説明は100文字以下で入力してください。",
  }),
  startDate: z.string().regex(/^\d{4}\/\d{2}\/\d{2}$/, {
    message: "開始日は YYYY/MM/DD 形式で入力してください。",
  }),
  endDate: z.string().regex(/^\d{4}\/\d{2}\/\d{2}$/, {
    message: "終了予定日は YYYY/MM/DD 形式で入力してください。",
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
          description: undefined,
          startDate: "",
          endDate: "",
          status: ProjectStatus.INACTIVE,
        },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      if (project) {
        const { project: updatedProject, error } = await updateProject(
          project.id,
          values
        );
        if (!updatedProject) {
          toast({
            title: "プロジェクトの更新に失敗しました",
            description: error,
          });
        } else {
          toast({
            title: "プロジェクトを更新しました",
            description: `プロジェクトID: ${updatedProject.id}`,
          });
          router.push(`/projects/${updatedProject.id}`);
        }
      } else {
        const { project: newProject, error } = await createProject(values);
        if (!newProject) {
          toast({
            title: "プロジェクトの作成に失敗しました",
            description: error,
          });
        } else {
          toast({
            title: "プロジェクトを作成しました",
            description: `プロジェクトID: ${newProject.id}`,
          });
          router.push(`/projects/${newProject.id}`);
        }
      }
      router.refresh();
    } catch (error) {
      toast({
        title: "プロジェクトの作成に失敗しました",
        description: "error: \n" + error,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleDelete = async () => {
    setIsSubmitting(true);
    try {
      const result = await deleteProject(project!.id);
      if (result.success) {
        toast({
          title: "プロジェクトを削除しました。",
          variant: "destructive",
        });
        router.push("/");
      } else {
        toast({
          title: "プロジェクトを削除できませんでした。",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "プロジェクトを削除できませんでした。",
        description: "error: \n" + error,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

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
              <DatePicker field={field}></DatePicker>
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
              <DatePicker field={field}></DatePicker>
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
        {project && (
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isSubmitting}
            className="ml-2"
          >
            削除
          </Button>
        )}
      </form>
    </Form>
  );
}
