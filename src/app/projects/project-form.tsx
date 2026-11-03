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
import { createProject, deleteProject, updateProject } from "./actions";
import type { ProjectStatus } from "@/types/wbs";
import {
  PROJECT_KINDS,
  PROJECT_KIND_LABELS,
  STANDING_CATEGORIES,
  STANDING_CATEGORY_LABELS,
  type ProjectKind,
  type StandingCategory,
} from "@/types/project";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { DatePicker } from "@/components/date-picker";
import { formatDate } from "@/utils/date-util";

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
  status: z
    .enum(["INACTIVE", "ACTIVE", "DONE", "CANCELLED", "PENDING"])
    .optional(), // TODO: 更新の場合は必須にする
  /** 種別（案件 / 常設）。作成時のみ選べる */
  kind: z.enum(PROJECT_KINDS),
  /** 常設プロジェクトの分類（常設のみ） */
  category: z.enum(STANDING_CATEGORIES).optional(),
});

const KIND_DESCRIPTIONS: Record<ProjectKind, string> = {
  PROJECT: "開始・終了が決まった案件。EVM や進捗分析の対象になります",
  STANDING: "保守・社内雑務など定常・不定期作業の受け皿。担当者の負荷にだけ反映し、EVM 等の案件分析からは除きます",
};

type ProjectFormProps = {
  project?: {
    id: string;
    name: string;
    description?: string;
    startDate: Date;
    endDate: Date;
    status?: ProjectStatus;
    kind?: ProjectKind;
    category?: StandingCategory;
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
        startDate: formatDate(project.startDate, "YYYY/MM/DD"),
        endDate: formatDate(project.endDate, "YYYY/MM/DD"),
        kind: project.kind ?? "PROJECT",
        category: project.category,
      }
      : {
        name: "",
        description: undefined,
        startDate: "",
        endDate: "",
        status: "INACTIVE",
        kind: "PROJECT",
        category: undefined,
      },
  });
  const kind = form.watch("kind");
  const isStanding = kind === "STANDING";

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      if (project) {
        const result = await updateProject(project.id, {
          name: values.name,
          description: values.description,
          startDate: values.startDate,
          endDate: values.endDate,
          status: values.status!,
          category: isStanding ? values.category : undefined,
        });
        if (!result.success) {
          toast({
            title: "プロジェクトの更新に失敗しました",
            description: result.error,
          });
        } else {
          toast({
            title: "プロジェクトを更新しました",
            description: `プロジェクトID: ${result.data.id}`,
          });
          router.push(`/projects/${result.data.id}`);
        }
      } else {
        const result = await createProject({
          name: values.name,
          description: values.description,
          startDate: new Date(values.startDate),
          endDate: new Date(values.endDate),
          kind: values.kind,
          category: isStanding ? values.category : undefined,
        });
        if (!result.success) {
          toast({
            title: "プロジェクトの作成に失敗しました",
            description: result.error,
          });
        } else {
          toast({
            title: "プロジェクトを作成しました",
            description: `プロジェクトID: ${result.data.id}`,
          });
          router.push(`/projects/${result.data.id}`);
        }
      }
      router.refresh();
    } catch (error) {
      toast({
        title: "プロジェクトの作成に失敗しました",
        description: "error: \n" + error,
        variant: "destructive",
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
          name="kind"
          render={({ field }) => (
            <FormItem>
              <FormLabel>種別</FormLabel>
              <FormControl>
                <RadioGroup
                  value={field.value}
                  onValueChange={field.onChange}
                  className="flex flex-col gap-2"
                >
                  {PROJECT_KINDS.map((option) => (
                    <div key={option} className="flex items-start space-x-3">
                      <RadioGroupItem
                        value={option}
                        id={`project-kind-${option}`}
                        className="mt-0.5"
                        disabled={!!project}
                      />
                      <div className="flex flex-col">
                        <Label htmlFor={`project-kind-${option}`} className="cursor-pointer font-medium">
                          {PROJECT_KIND_LABELS[option]}
                        </Label>
                        <span className="text-xs text-gray-500">{KIND_DESCRIPTIONS[option]}</span>
                      </div>
                    </div>
                  ))}
                </RadioGroup>
              </FormControl>
              {project && (
                <p className="text-xs text-muted-foreground">種別は作成後に変更できません。</p>
              )}
              <FormMessage />
            </FormItem>
          )}
        />
        {isStanding && (
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>分類</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? ""}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="分類を選択（任意）" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {STANDING_CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {STANDING_CATEGORY_LABELS[category]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
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
              {isStanding && (
                <p className="text-xs text-muted-foreground">
                  常設の場合は保守契約の終了日や年度末など、運用上の目安を入れてください。負荷への反映は定常枠の有効期間で決まります。
                </p>
              )}
              <FormMessage />
            </FormItem>
          )}
        />
        {project && (
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>ステータス</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
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
        )}
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
