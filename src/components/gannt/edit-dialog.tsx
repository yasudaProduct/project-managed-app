"use client";

import { Control, useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { Input } from "../ui/input";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "../ui/button";
import { Task } from "gantt-task-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { DatePicker } from "../date-picker";
import SelectPhases, { SelectAssignee, SelectStatus } from "../form/select";
import { formatDateyyyymmdd } from "@/lib/utils";
import { updateTask } from "@/app/wbs/[id]/wbs-task-actions";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";

const formSchema = z.object({
  name: z.string().min(1, {
    message: "タスク名を入力して下さい",
  }),
  wbsId: z.string().min(1, {
    message: "WBSIDを入力して下さい",
  }),
  assigneeId: z.string().min(1, {
    message: "担当者を入力して下さい",
  }),
  yoteiStartDate: z.string().regex(/^\d{4}\/\d{2}\/\d{2}$/, {
    message: "予定開始日は YYYY/MM/DD 形式で入力してください。",
  }),
  yoteiEndDate: z.string().regex(/^\d{4}\/\d{2}\/\d{2}$/, {
    message: "予定基準終了日は YYYY/MM/DD 形式で入力してください。",
  }),
  yoteiKosu: z.preprocess(
    (val) => Number(val),
    z.number().min(0, {
      message: "工数は0以上の数値を入力してください。",
    })
  ),
  status: z.enum(["NOT_STARTED", "IN_PROGRESS", "COMPLETED"] as const, {
    message: "有効なタスクステータスを選択してください。",
  }),
  phaseId: z.preprocess(
    (val) => Number(val),
    z.number().min(0, {
      message: "フェーズは必須です。",
    })
  ),
});

type EditDialogProps = {
  children: React.ReactNode;
  task: Task;
  wbsId: number;
};

export default function EditDialog({ children, task, wbsId }: EditDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: task?.name,
      wbsId: task?.id,
      assigneeId: task?.assignee.id,
      yoteiStartDate: task?.yoteiStart
        ? formatDateyyyymmdd(task?.yoteiStart?.toISOString())
        : "",
      yoteiEndDate: task?.yoteiEnd
        ? formatDateyyyymmdd(task?.yoteiEnd?.toISOString())
        : "",
      yoteiKosu: task?.yoteiKosu,
      status: task?.status,
      phaseId: task?.phase.id,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setIsSubmitting(true);
      const result = await updateTask(wbsId, task.id, {
        id: values.wbsId,
        name: values.name,
        yoteiStart: values.yoteiStartDate,
        yoteiEnd: values.yoteiEndDate,
        yoteiKosu: values.yoteiKosu,
        status: values.status,
        phaseId: values.phaseId,
        assigneeId: values.assigneeId,
      });

      if (result.success) {
        toast({
          title: "タスクを更新しました",
          description: "タスクが更新されました",
        });
      } else {
        toast({
          title: "タスクの更新に失敗しました",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "タスクの更新に失敗しました",
        description: error instanceof Error ? error.message : "不明なエラー",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  // 親コンポーネントや他のリスナーがこのイベントを受け取るのを防ぐ。
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    event.stopPropagation();
  };

  const FromItem = ({
    label,
    name,
    placeholder,
    type = "text",
    control,
  }: {
    label: string;
    name: string;
    placeholder: string;
    type?:
      | "text"
      | "date"
      | "number"
      | "selectPhases"
      | "selectAssignee"
      | "selectStatus";
    control: Control<z.infer<typeof formSchema>>;
  }) => {
    return (
      <FormField
        control={control}
        name={name as keyof z.infer<typeof formSchema>}
        render={({ field }) => (
          <FormItem>
            <FormLabel>{label}</FormLabel>
            <FormControl>
              {type === "date" ? (
                <DatePicker field={field} />
              ) : type === "number" ? (
                <Input
                  type="number"
                  step="any"
                  placeholder={placeholder}
                  {...field}
                  onKeyDown={handleKeyDown}
                />
              ) : type === "selectAssignee" ? (
                <SelectAssignee field={field} wbsId={wbsId} />
              ) : type === "selectPhases" ? (
                <SelectPhases field={field} wbsId={wbsId} />
              ) : type === "selectStatus" ? (
                <SelectStatus field={field} />
              ) : (
                <Input
                  placeholder={placeholder}
                  {...field}
                  onKeyDown={handleKeyDown}
                />
              )}
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    );
  };

  return (
    <Dialog modal={true}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="w-auto p-2">
        <DialogHeader>
          <DialogTitle>タスク編集</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FromItem
              label="タスク名"
              name="name"
              placeholder="タスク名"
              control={form.control}
            />
            <FromItem
              label="WBSID"
              name="wbsId"
              placeholder="WBSID"
              control={form.control}
            />
            <FromItem
              label="担当者"
              name="assigneeId"
              placeholder="担当者"
              control={form.control}
              type="selectAssignee"
            />
            <FromItem
              label="予定開始日"
              name="yoteiStartDate"
              placeholder="YYYY/MM/DD"
              control={form.control}
              type="date"
            />
            <FromItem
              label="予定終了日"
              name="yoteiEndDate"
              placeholder="YYYY/MM/DD"
              control={form.control}
              type="date"
            />
            <FromItem
              label="工数"
              name="yoteiKosu"
              placeholder="工数"
              control={form.control}
              type="number"
            />
            <FromItem
              label="ステータス"
              name="status"
              placeholder="ステータス"
              control={form.control}
              type="selectStatus"
            />
            <FromItem
              label="フェーズ"
              name="phaseId"
              placeholder="フェーズ"
              control={form.control}
              type="selectPhases"
            />
            {/* <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>タスク名</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="タスク名"
                      {...field}
                      onKeyDown={handleKeyDown}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="assignee"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>担当者</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="担当者"
                      {...field}
                      onKeyDown={handleKeyDown}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            /> */}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "更新中..." : "更新"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
