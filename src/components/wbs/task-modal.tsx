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
  DialogFooter,
} from "@/components/ui/dialog";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "../ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Badge } from "@/components/ui/badge";
import { getTaskStatusName } from "@/utils/utils";
import { WbsTask } from "@/types/wbs";
import {
  createTask,
  updateTask,
} from "@/app/wbs/[id]/actions/wbs-task-actions";
import { toast } from "@/hooks/use-toast";
import { DatePicker } from "../date-picker";
import { getWbsAssignees } from "@/app/wbs/assignee/assignee-actions";
import { getWbsPhases } from "@/app/wbs/[id]/actions/wbs-phase-actions";
import {
  CalendarDays,
  User,
  Clock,
  Flag,
  Target,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { formatDateToLocalString } from "../ganttv2/gantt-utils";
import { formatDate } from "@/utils/date-util";

const formSchema = z
  .object({
    name: z
      .string()
      .min(1, { message: "タスク名は必須です。" })
      .max(100, { message: "タスク名は100文字以内で入力してください。" }),
    assigneeId: z.string().min(1, {
      message: "担当者を選択してください。",
    }),
    yoteiStartDate: z.string().regex(/^\d{4}\/\d{2}\/\d{2}$/, {
      message: "予定開始日は YYYY/MM/DD 形式で入力してください。",
    }),
    yoteiEndDate: z.string().regex(/^\d{4}\/\d{2}\/\d{2}$/, {
      message: "予定終了日は YYYY/MM/DD 形式で入力してください。",
    }),
    yoteiKosu: z.preprocess(
      (val) => Number(val),
      z
        .number()
        .min(0, { message: "工数は0以上の数値を入力してください。" })
        .max(1000, { message: "工数は1000時間以内で入力してください。" })
    ),
    status: z.enum(
      ["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "ON_HOLD"] as const,
      {
        message: "ステータスを選択してください。",
      }
    ),
    phaseId: z.preprocess(
      (val) => Number(val),
      z.number().min(1, {
        message: "工程を選択してください。",
      })
    ),
  })
  .refine(
    (data) => {
      // 開始日と終了日の妥当性チェック
      const startDate = new Date(data.yoteiStartDate.replace(/\//g, "-"));
      const endDate = new Date(data.yoteiEndDate.replace(/\//g, "-"));
      return startDate <= endDate;
    },
    {
      message: "予定終了日は予定開始日以降の日付を入力してください。",
      path: ["yoteiEndDate"],
    }
  );

interface TaskModalProps {
  wbsId: number;
  task?: WbsTask;
  children?: ReactNode;
  isOpen?: boolean;
  onClose?: () => void;
}

export function TaskModal({
  wbsId,
  task,
  children,
  isOpen: externalIsOpen,
  onClose,
}: TaskModalProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;

  // 日付変換のヘルパー関数
  const formatDateForForm = (date: string | Date | undefined): string => {
    if (!date) return "";
    if (typeof date === "string") return date;
    return date.toISOString().split("T")[0].replace(/-/g, "/");
  };
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [assignees, setAssignees] = useState<{ id: string; name: string }[]>(
    []
  );
  const [phases, setPhases] = useState<
    { id: number; name: string; code: string; seq: number }[]
  >([]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: task
      ? {
          name: task.name,
          assigneeId: task.assigneeId?.toString() || "",
          yoteiStartDate: task.yoteiStart
            ? formatDateToLocalString(task.yoteiStart)
            : "",
          yoteiEndDate: task.yoteiEnd
            ? formatDateToLocalString(task.yoteiEnd)
            : "",
          yoteiKosu: task.yoteiKosu || 0,
          status: task.status,
          phaseId: task.phaseId || 0,
        }
      : {
          name: "",
          assigneeId: "",
          yoteiStartDate: "",
          yoteiEndDate: "",
          yoteiKosu: 0,
          status: "NOT_STARTED",
          phaseId: 0,
        },
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!isOpen) return;

      setIsLoading(true);
      try {
        // 担当者リストを取得
        const assigneesData = await getWbsAssignees(wbsId);
        const assigneesList =
          assigneesData
            ?.map((a) => ({
              id: a.assignee?.id?.toString() ?? "",
              name: a.assignee?.displayName ?? "",
            }))
            .filter((a) => a.id && a.name) ?? [];
        setAssignees(assigneesList);

        // 工程リストを取得
        const phasesData = await getWbsPhases(wbsId);
        const phasesList = phasesData.map((p) => ({
          id: p.id,
          name: p.name,
          code: p.code,
          seq: p.seq,
        }));
        setPhases(phasesList);

        // 編集時にフォームの値を設定
        if (task) {
          form.reset({
            name: task.name,
            assigneeId: task.assigneeId?.toString() || "",
            yoteiStartDate: formatDateForForm(task.yoteiStart),
            yoteiEndDate: formatDateForForm(task.yoteiEnd),
            yoteiKosu: task.yoteiKosu || 0,
            status: task.status,
            phaseId: task.phaseId || 0,
          });
        }
      } catch {
        toast({
          title: "データの取得に失敗しました",
          description: "担当者と工程の情報を取得できませんでした。",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [wbsId, isOpen, task, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setIsSubmitting(true);
      if (!task) {
        const result = await createTask(wbsId, {
          // id: values.id,
          name: values.name,
          periods: [
            // ここはservice側で作成する
            {
              startDate: values.yoteiStartDate,
              endDate: values.yoteiEndDate,
              type: "YOTEI",
              kosus: [{ kosu: values.yoteiKosu, type: "NORMAL" }],
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
        console.log("values.yoteiStartDate", values.yoteiStartDate);
        console.log("values.yoteiEndDate", values.yoteiEndDate);
        console.log("values.yoteiStartDate", new Date(values.yoteiStartDate));
        console.log("values.yoteiEndDate", new Date(values.yoteiEndDate));
        console.log("newDate", new Date());

        const result = await updateTask(wbsId, {
          id: Number(task.id),
          name: values.name,
          yoteiStart: new Date(values.yoteiStartDate),
          yoteiEnd: new Date(values.yoteiEndDate),
          yoteiKosu: values.yoteiKosu,
          status: values.status,
          assigneeId: Number(values.assigneeId),
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
      if (onClose) {
        requestAnimationFrame(() => {
          onClose();
        });
      } else {
        setInternalIsOpen(false);
      }
    }
  }

  const isEditMode = !!task;
  const modalTitle = isEditMode ? "タスクを編集" : "新規タスク追加";
  const submitButtonText = isEditMode
    ? isSubmitting
      ? "更新中..."
      : "更新"
    : isSubmitting
    ? "作成中..."
    : "作成";

  const handleOpenChange = (open: boolean) => {
    if (onClose && !open) {
      // ダイアログがクローズ処理（フォーカストラップの解放など）を完了する前に
      // コンポーネントがアンマウントされることで、Radix UI のクローズ処理が壊れて固まっている
      // Radixのクローズ処理が完了するのを待ってから親のunmountを実行する
      requestAnimationFrame(() => {
        onClose();
      });
    } else {
      setInternalIsOpen(open);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-600" />
            {modalTitle}
          </DialogTitle>
          {isEditMode && task && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Badge variant="outline" className="px-2 py-1">
                  {getTaskStatusName(task.status)}
                </Badge>
                <span>ID: {task.id}</span>
              </div>

              {/* 元の値を表示 */}
              <div className="bg-gray-50 rounded-lg p-4 border">
                <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  現在の設定値
                </h4>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  <div>
                    <span className="text-gray-500">タスク名:</span>
                    <span className="ml-2 font-medium">{task.name}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">工程:</span>
                    <span className="ml-2 font-medium">
                      {task.phase?.name || "未設定"}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">担当者:</span>
                    <span className="ml-2 font-medium">
                      {task.assignee?.displayName || "未設定"}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">ステータス:</span>
                    <span className="ml-2 font-medium">
                      {getTaskStatusName(task.status)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">予定開始:</span>
                    <span className="ml-2 font-medium">
                      {task.yoteiStart
                        ? typeof task.yoteiStart === "string"
                          ? task.yoteiStart
                          : formatDate(task.yoteiStart, "YYYY/MM/DD")
                        : "未設定"}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">予定終了:</span>
                    <span className="ml-2 font-medium">
                      {task.yoteiEnd
                        ? typeof task.yoteiEnd === "string"
                          ? task.yoteiEnd
                          : formatDate(task.yoteiEnd, "YYYY/MM/DD")
                        : "未設定"}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">予定工数:</span>
                    <span className="ml-2 font-medium">
                      {task.yoteiKosu || 0}時間
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span>データを読み込み中...</span>
              </div>
            )}

            {!isLoading && (
              <div className="space-y-6">
                {/* 基本情報セクション */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium flex items-center gap-2">
                    <Flag className="h-4 w-4" />
                    基本情報
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* 工程選択 */}
                    <FormField
                      control={form.control}
                      name="phaseId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">
                            工程 *
                          </FormLabel>
                          <FormControl>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value.toString()}
                              disabled={isLoading}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="工程を選択してください" />
                              </SelectTrigger>
                              <SelectContent>
                                {phases.length > 0 ? (
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
                                    工程が見つかりません
                                  </SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* 担当者選択 */}
                    <FormField
                      control={form.control}
                      name="assigneeId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium flex items-center gap-1">
                            <User className="h-3 w-3" />
                            担当者 *
                          </FormLabel>
                          <FormControl>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                              disabled={isLoading}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="担当者を選択してください" />
                              </SelectTrigger>
                              <SelectContent>
                                {assignees.length > 0 ? (
                                  assignees.map((user) => (
                                    <SelectItem key={user.id} value={user.id}>
                                      {user.name}
                                    </SelectItem>
                                  ))
                                ) : (
                                  <SelectItem value="nothing" disabled>
                                    担当者が見つかりません
                                  </SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* タスク名 */}
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">
                          タスク名 *
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="例：機能A作成"
                            {...field}
                            className="text-sm"
                          />
                        </FormControl>
                        <FormDescription>
                          具体的で分かりやすいタスク名を入力してください（最大100文字）
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* 日程と工数セクション */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    日程・工数
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* 予定開始日 */}
                    <FormField
                      control={form.control}
                      name="yoteiStartDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">
                            予定開始日 *
                          </FormLabel>
                          <DatePicker field={field} />
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* 予定終了日 */}
                    <FormField
                      control={form.control}
                      name="yoteiEndDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">
                            予定終了日 *
                          </FormLabel>
                          <DatePicker field={field} />
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* 予定工数 */}
                    <FormField
                      control={form.control}
                      name="yoteiKosu"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            予定工数 *
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                {...field}
                                type="number"
                                step="0.5"
                                min="0"
                                max="1000"
                                placeholder="8"
                                className="text-sm pr-12"
                              />
                              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">
                                時間
                              </span>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* ステータスセクション */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    ステータス
                  </h3>

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">
                          ステータス *
                        </FormLabel>
                        <FormControl>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                            disabled={isLoading}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="ステータスを選択してください" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="NOT_STARTED">
                                {getTaskStatusName("NOT_STARTED")}
                              </SelectItem>
                              <SelectItem value="IN_PROGRESS">
                                {getTaskStatusName("IN_PROGRESS")}
                              </SelectItem>
                              <SelectItem value="COMPLETED">
                                {getTaskStatusName("COMPLETED")}
                              </SelectItem>
                              <SelectItem value="ON_HOLD">
                                {getTaskStatusName("ON_HOLD")}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormDescription>
                          タスクの現在の進行状況を選択してください
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            <DialogFooter className="gap-2 pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isSubmitting}
              >
                キャンセル
              </Button>
              {isEditMode && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    if (task) {
                      form.reset({
                        name: task.name,
                        assigneeId: task.assigneeId?.toString() || "",
                        yoteiStartDate: formatDateForForm(task.yoteiStart),
                        yoteiEndDate: formatDateForForm(task.yoteiEnd),
                        yoteiKosu: task.yoteiKosu || 0,
                        status: task.status,
                        phaseId: task.phaseId || 0,
                      });
                      toast({
                        title: "フォームをリセットしました",
                        description: "元の値に戻しました",
                      });
                    }
                  }}
                  disabled={isSubmitting || isLoading}
                >
                  元に戻す
                </Button>
              )}
              <Button
                type="submit"
                disabled={isSubmitting || isLoading}
                className="min-w-[100px]"
              >
                {isSubmitting && (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                )}
                {submitButtonText}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
