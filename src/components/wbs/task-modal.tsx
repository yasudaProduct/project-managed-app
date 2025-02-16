"use client";

import { ReactNode, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "../ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { getTaskStatusName } from "@/lib/utils";
import { WbsTask } from "@/types/wbs";
import { createTask, updateTask } from "@/app/wbs/[id]/wbs-task-actions";
import { toast } from "@/hooks/use-toast";
import { DatePicker } from "../date-picker";
import { getWbsAssignees } from "@/app/wbs/assignee/assignee-actions";
import { getWbsPhases } from "@/app/wbs/[id]/wbs-phase-actions";

const formSchema = z.object({
  id: z.string().min(1, {
    message: "WBS IDは必須です。",
  }),
  name: z.string().min(1, {
    message: "タスク名は必須です。",
  }),
  assigneeId: z.string().min(1, {
    message: "担当者は必須です。",
  }),
  kijunStartDate: z.string().regex(/^\d{4}\/\d{2}\/\d{2}$/, {
    message: "基準開始日は YYYY/MM/DD 形式で入力してください。",
  }),
  kijunEndDate: z.string().regex(/^\d{4}\/\d{2}\/\d{2}$/, {
    message: "基準終了日は YYYY/MM/DD 形式で入力してください。",
  }),
  kijunKosu: z.preprocess(
    (val) => Number(val),
    z.number().min(0, {
      message: "工数は0以上の数値を入力してください。",
    })
  ),
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
  jissekiStartDate: z.string().regex(/^\d{4}\/\d{2}\/\d{2}$/, {
    message: "実績開始日は YYYY/MM/DD 形式で入力してください。",
  }),
  jissekiEndDate: z.string().regex(/^\d{4}\/\d{2}\/\d{2}$/, {
    message: "実績終了日は YYYY/MM/DD 形式で入力してください。",
  }),
  jissekiKosu: z.preprocess(
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

interface TaskModalProps {
  wbsId: number;
  task?: WbsTask;
  children: ReactNode;
}

export function TaskModal({ wbsId, task, children }: TaskModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assignees, setAssignees] = useState<{ id: string; name: string }[]>();
  const [phases, setPhases] =
    useState<{ id: number; name: string; seq: number }[]>();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      id: "",
      name: "",
      assigneeId: "",
      kijunStartDate: "",
      kijunEndDate: "",
      kijunKosu: 0,
      yoteiStartDate: "",
      yoteiEndDate: "",
      yoteiKosu: 0,
      jissekiStartDate: "",
      jissekiEndDate: "",
      jissekiKosu: 0,
      status: "NOT_STARTED",
      phaseId: 0,
    },
    ...(task && {
      id: task.id,
      name: task.name,
      assigneeId: task.assigneeId,
      kijunStartDate: task.kijunStart,
      kijunEndDate: task.kijunEnd,
      kijunKosu: task.kijunKosu,
      yoteiStartDate: task.yoteiStart,
      yoteiEndDate: task.yoteiEnd,
      yoteiKosu: task.yoteiKosu,
      jissekiStartDate: task.jissekiStart,
      jissekiEndDate: task.jissekiEnd,
      jissekiKosu: task.jissekiKosu,
      status: task.status,
      phaseId: task.phaseId,
    }),
  });

  useEffect(() => {
    const fetchDate = async () => {
      // 担当者リストを取得
      const assignees = (await getWbsAssignees(wbsId)).map((a) => {
        return {
          id: a.assignee.id,
          name: a.assignee.displayName,
        };
      });
      setAssignees(assignees);

      // 工程リストを取得
      const phases = (await getWbsPhases(wbsId)).map((p) => {
        return {
          id: p.id,
          name: p.name,
          seq: p.seq,
        };
      });
      setPhases(phases);
    };
    fetchDate();
  }, []);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setIsSubmitting(true);
      if (!task) {
        const result = await createTask(wbsId, {
          id: values.id,
          name: values.name,
          periods: [
            // ここはservice側である
            {
              startDate: values.kijunStartDate,
              endDate: values.kijunEndDate,
              type: "KIJUN",
              kosus: [{ kosu: values.kijunKosu, type: "NORMAL" }],
            },
            {
              startDate: values.yoteiStartDate,
              endDate: values.yoteiEndDate,
              type: "YOTEI",
              kosus: [{ kosu: values.yoteiKosu, type: "NORMAL" }],
            },
            {
              startDate: values.jissekiStartDate,
              endDate: values.jissekiEndDate,
              type: "JISSEKI",
              kosus: [{ kosu: values.jissekiKosu, type: "NORMAL" }],
            },
          ],
          status: values.status,
          assigneeId: values.assigneeId,
          phaseId: values.phaseId,
        });
        if (result.success) {
          toast({
            title: "タスクを追加しました",
            description: "タスクが追加されました",
          });
        } else {
          toast({
            title: "タスクの追加に失敗しました",
            description: result.error,
            variant: "destructive",
          });
        }
      } else {
        const result = await updateTask(wbsId, task.id, {
          id: values.id,
          name: values.name,
          kijunStart: values.kijunStartDate,
          kijunEnd: values.kijunEndDate,
          kijunKosu: values.kijunKosu,
          yoteiStart: values.yoteiStartDate,
          yoteiEnd: values.yoteiEndDate,
          yoteiKosu: values.yoteiKosu,
          jissekiStart: values.jissekiStartDate,
          jissekiEnd: values.jissekiEndDate,
          jissekiKosu: values.jissekiKosu,
          status: values.status,
          assigneeId: values.assigneeId,
          phaseId: values.phaseId,
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
      }
    } catch (error) {
      toast({
        title: "タスクの追加に失敗しました",
        description: error instanceof Error ? error.message : "不明なエラー",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      setIsOpen(false);
    }
  }

  // const addItem = async (newTasks: WbsTask) => {
  //   try {
  //     const result = await createTask(wbsId, {
  //       id: newTasks.id,
  //       name: newTasks.name,
  //       periods: newTasks.periods?.map((period) => ({
  //         startDate: period.startDate.toISOString(),
  //         endDate: period.endDate.toISOString(),
  //         type: period.type,
  //         kosus: period.kosus.map((kosu) => ({
  //           kosu: kosu.kosu,
  //           type: kosu.type,
  //         })),
  //       })),
  //       status: newTasks.status,
  //       assigneeId: newTasks.assigneeId,
  //       phaseId: newTasks.phaseId,
  //     });
  //     if (result.success) {
  //       toast({
  //         title: "タスクを追加しました",
  //         description: "タスクが追加されました",
  //       });
  //     }
  //   } catch (error) {
  //     toast({
  //       title: "タスクの追加に失敗しました",
  //       description: error instanceof Error ? error.message : "不明なエラー",
  //       variant: "destructive",
  //     });
  //   }
  // };

  // const updateItem = async (taskId: string, updatedTask: WbsTask) => {
  //   try {
  //     const result = await updateTask(taskId, updatedTask);
  //     if (result.success) {
  //       toast({
  //         title: "タスクを更新しました",
  //         description: "タスクが更新されました",
  //       });
  //     } else {
  //       toast({
  //         title: "タスクの更新に失敗しました",
  //         description: result.error,
  //         variant: "destructive",
  //       });
  //     }
  //   } catch (error) {
  //     toast({
  //       title: "タスクの更新に失敗しました",
  //       description: error instanceof Error ? error.message : "不明なエラー",
  //       variant: "destructive",
  //     });
  //   }
  // };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {/* <Button className="mb-4">
          <Plus className="h-4 w-4" />
          <LayoutList className="h-4 w-4" />
        </Button> */}
        {children}
      </DialogTrigger>
      <DialogContent className="min-w-full">
        <DialogHeader>
          <DialogTitle>新規タスク追加</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid gap-1 py-4">
              <div className="grid grid-cols-2 items-center gap-2">
                <label htmlFor="phaseId">フェーズID</label>
                <FormField
                  control={form.control}
                  name="phaseId"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value.toString()}
                        >
                          <SelectTrigger className="col-span-3">
                            <SelectValue placeholder="フェーズを選択" />
                          </SelectTrigger>
                          <SelectContent>
                            {phases ? (
                              phases.length > 0 ? (
                                phases.map((phase) => (
                                  <SelectItem
                                    key={phase.id}
                                    value={phase.id.toString()}
                                  >
                                    {phase.name}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="nothing" disabled>
                                  工程を追加してください。
                                </SelectItem>
                              )
                            ) : (
                              <SelectItem value="loading" disabled>
                                読み込み中...
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <label htmlFor="wbsId">WBS ID</label>
                <FormField
                  control={form.control}
                  name="id"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input placeholder="D1-0001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <label htmlFor="name">名前</label>
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input placeholder="機能A作成" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <label htmlFor="assigneeId">担当者</label>
                <FormField
                  control={form.control}
                  name="assigneeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <SelectTrigger className="col-span-3">
                            <SelectValue placeholder="担当者を選択" />
                          </SelectTrigger>
                          <SelectContent>
                            {assignees ? (
                              assignees.length > 0 ? (
                                assignees.map((user) => (
                                  <SelectItem key={user.id} value={user.id}>
                                    {user.name}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="nothing" disabled>
                                  担当者を追加してください。
                                </SelectItem>
                              )
                            ) : (
                              <SelectItem value="loading" disabled>
                                読み込み中...
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <label htmlFor="kijunStartDate">基準開始日</label>
                <FormField
                  control={form.control}
                  name="kijunStartDate"
                  render={({ field }) => (
                    <FormItem>
                      <DatePicker field={field}></DatePicker>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <label htmlFor="kijunEndDate">基準終了日</label>
                <FormField
                  control={form.control}
                  name="kijunEndDate"
                  render={({ field }) => (
                    <FormItem>
                      <DatePicker field={field}></DatePicker>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <label htmlFor="kijunKosu">基準工数</label>
                <FormField
                  control={form.control}
                  name="kijunKosu"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          step="any"
                          placeholder="工数"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <label htmlFor="yoteiStartDate">予定開始日</label>
                <FormField
                  control={form.control}
                  name="yoteiStartDate"
                  render={({ field }) => (
                    <FormItem>
                      <DatePicker field={field}></DatePicker>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <label htmlFor="yoteiEndDate">予定終了日</label>
                <FormField
                  control={form.control}
                  name="yoteiEndDate"
                  render={({ field }) => (
                    <FormItem>
                      <DatePicker field={field}></DatePicker>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <label htmlFor="yoteiKosu">予定工数</label>
                <FormField
                  control={form.control}
                  name="yoteiKosu"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          step="any"
                          placeholder="工数"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <label htmlFor="jissekiStartDate">実績開始日</label>
                <FormField
                  control={form.control}
                  name="jissekiStartDate"
                  render={({ field }) => (
                    <FormItem>
                      <DatePicker field={field}></DatePicker>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <label htmlFor="jissekiEndDate">実績終了日</label>
                <FormField
                  control={form.control}
                  name="jissekiEndDate"
                  render={({ field }) => (
                    <FormItem>
                      <DatePicker field={field}></DatePicker>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <label htmlFor="jissekiKosu">実績工数</label>
                <FormField
                  control={form.control}
                  name="jissekiKosu"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          step="any"
                          placeholder="工数"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <label htmlFor="status">状況</label>
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <SelectTrigger className="col-span-3">
                            <SelectValue placeholder="ステータスを選択" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem key="NOT_STARTED" value="NOT_STARTED">
                              {getTaskStatusName("NOT_STARTED")}
                            </SelectItem>
                            <SelectItem key="IN_PROGRESS" value="IN_PROGRESS">
                              {getTaskStatusName("IN_PROGRESS")}
                            </SelectItem>
                            <SelectItem key="COMPLETED" value="COMPLETED">
                              {getTaskStatusName("COMPLETED")}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "追加中..." : "追加"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
