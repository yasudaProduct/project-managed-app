"use client";

import { useState, useEffect, useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { MilestoneForecastDto } from "@/applications/milestone/milestone-application-service";
import {
  MILESTONE_TARGET_TYPES,
  MILESTONE_TARGET_TYPE_LABELS,
  MILESTONE_TARGET_TYPE_DESCRIPTIONS,
  type MilestoneTargetInput,
} from "@/types/milestone";
import {
  createMilestone,
  updateMilestone,
  deleteMilestone,
} from "@/app/wbs/[id]/actions/milestone-actions";
import { toast } from "@/hooks/use-toast";
import { Trash2, Calendar } from "lucide-react";

const formSchema = z
  .object({
    name: z.string().min(1, "マイルストーン名を入力してください"),
    date: z.string().min(1, "日付を入力してください"),
    targetType: z.enum(MILESTONE_TARGET_TYPES),
    phaseId: z.string(),
    taskIds: z.array(z.number()),
    /** 空文字は未達成 */
    achievedAt: z.string(),
  })
  .superRefine((values, ctx) => {
    if (values.targetType === "PHASE" && !values.phaseId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["phaseId"], message: "対象フェーズを選択してください" });
    }
    if (values.targetType === "TASKS" && values.taskIds.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["taskIds"], message: "対象タスクを1件以上選択してください" });
    }
  });

type MilestoneFormValues = z.infer<typeof formSchema>;

const EMPTY_FORM: MilestoneFormValues = {
  name: "",
  date: "",
  targetType: "EVENT",
  phaseId: "",
  taskIds: [],
  achievedAt: "",
};

/** <input type="date"> の値（YYYY-MM-DD）を UTC 深夜0時の Date にする */
const dateInputToUtc = (value: string) => new Date(`${value}T00:00:00.000Z`);
const isoToDateInput = (iso: string | null) => (iso ? iso.slice(0, 10) : "");

function toTarget(values: MilestoneFormValues): MilestoneTargetInput {
  switch (values.targetType) {
    case "PHASE":
      return { targetType: "PHASE", phaseId: Number(values.phaseId) };
    case "TASKS":
      return { targetType: "TASKS", taskIds: values.taskIds };
    default:
      return { targetType: "EVENT" };
  }
}

interface MilestoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  milestone?: MilestoneForecastDto;
  wbsId: number;
  /** フェーズ完了型の選択肢 */
  phases: Array<{ id: number; name: string }>;
  /** タスク指定型の選択肢 */
  tasks: Array<{ id: number; taskNo?: string; name: string }>;
  onMilestoneUpdate?: () => void;
}

export function MilestoneModal({
  isOpen,
  onClose,
  milestone,
  wbsId,
  phases,
  tasks,
  onMilestoneUpdate,
}: MilestoneModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [taskFilter, setTaskFilter] = useState("");

  const isEditing = Boolean(milestone?.id);

  const form = useForm<MilestoneFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: EMPTY_FORM,
  });
  const targetType = form.watch("targetType");

  const filteredTasks = useMemo(() => {
    const keyword = taskFilter.trim();
    if (!keyword) return tasks;
    return tasks.filter(
      (task) => task.name.includes(keyword) || (task.taskNo ?? "").includes(keyword)
    );
  }, [tasks, taskFilter]);

  // モーダルが開かれた時にフィールドを初期化
  useEffect(() => {
    if (isOpen) {
      setTaskFilter("");
      if (milestone) {
        form.reset({
          name: milestone.name,
          date: isoToDateInput(milestone.date),
          targetType: milestone.targetType,
          phaseId: milestone.phaseId !== null ? String(milestone.phaseId) : "",
          taskIds: milestone.taskIds,
          achievedAt: isoToDateInput(milestone.achievedAt),
        });
      } else {
        form.reset(EMPTY_FORM);
      }
    }
  }, [isOpen, milestone, form]);

  const onSubmit = async (values: MilestoneFormValues) => {
    setIsLoading(true);

    try {
      const milestoneData = {
        name: values.name.trim(),
        date: dateInputToUtc(values.date),
        wbsId,
        target: toTarget(values),
        achievedAt: values.achievedAt ? dateInputToUtc(values.achievedAt) : null,
      };

      const result =
        isEditing && milestone
          ? await updateMilestone({ ...milestoneData, id: milestone.id })
          : await createMilestone(milestoneData);

      if (result.success) {
        toast({
          title: isEditing
            ? "マイルストーンを更新しました"
            : "マイルストーンを作成しました",
          description: `${values.name}を${isEditing ? "更新" : "作成"}しました`,
        });
        onClose();
        if (onMilestoneUpdate) {
          onMilestoneUpdate();
        }
      } else {
        toast({
          title: "エラー",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "エラー",
        description: "予期しないエラーが発生しました",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!milestone?.id) return;

    setIsLoading(true);
    try {
      const result = await deleteMilestone(milestone.id, wbsId);

      if (result.success) {
        toast({
          title: "マイルストーンを削除しました",
          description: `${milestone.name}を削除しました`,
        });
        onClose();
        if (onMilestoneUpdate) {
          onMilestoneUpdate();
        }
      } else {
        toast({
          title: "削除エラー",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "エラー",
        description: "予期しないエラーが発生しました",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setShowDeleteDialog(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {isEditing ? "マイルストーンを編集" : "新しいマイルストーン"}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>マイルストーン名</FormLabel>
                    <FormControl>
                      <Input placeholder="マイルストーン名を入力" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>日付</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="targetType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>達成の対象</FormLabel>
                    <FormControl>
                      <RadioGroup value={field.value} onValueChange={field.onChange}>
                        {MILESTONE_TARGET_TYPES.map((type) => (
                          <div key={type} className="flex items-start space-x-3">
                            <RadioGroupItem value={type} id={`milestone-target-${type}`} />
                            <Label htmlFor={`milestone-target-${type}`} className="cursor-pointer">
                              <div className="flex flex-col">
                                <span className="font-medium">{MILESTONE_TARGET_TYPE_LABELS[type]}</span>
                                <span className="text-xs text-gray-500 font-normal">
                                  {MILESTONE_TARGET_TYPE_DESCRIPTIONS[type]}
                                </span>
                              </div>
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {targetType === "PHASE" && (
                <FormField
                  control={form.control}
                  name="phaseId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>対象フェーズ</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="フェーズを選択" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {phases.map((phase) => (
                            <SelectItem key={phase.id} value={String(phase.id)}>
                              {phase.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {targetType === "TASKS" && (
                <FormField
                  control={form.control}
                  name="taskIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>対象タスク（{field.value.length}件選択）</FormLabel>
                      <Input
                        placeholder="タスク番号・タスク名で絞り込み"
                        value={taskFilter}
                        onChange={(e) => setTaskFilter(e.target.value)}
                      />
                      <div className="max-h-48 overflow-y-auto rounded border p-2 space-y-1">
                        {filteredTasks.map((task) => {
                          const checked = field.value.includes(task.id);
                          return (
                            <div key={task.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`milestone-task-${task.id}`}
                                checked={checked}
                                onCheckedChange={(value) =>
                                  field.onChange(
                                    value
                                      ? [...field.value, task.id]
                                      : field.value.filter((id) => id !== task.id)
                                  )
                                }
                              />
                              <Label
                                htmlFor={`milestone-task-${task.id}`}
                                className="cursor-pointer text-sm font-normal"
                              >
                                <span className="font-mono text-xs text-gray-500 mr-2">
                                  {task.taskNo}
                                </span>
                                {task.name}
                              </Label>
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-xs text-gray-500">
                        WBS同期でタスク番号が振り直されると紐付けが切れます（一覧に「紐付け切れ」と表示します）。
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="achievedAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>達成日（任意）</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-between pt-4">
                <div>
                  {isEditing && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => setShowDeleteDialog(true)}
                      disabled={isLoading}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      削除
                    </Button>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    disabled={isLoading}
                  >
                    キャンセル
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? "保存中..." : isEditing ? "更新" : "作成"}
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>マイルストーンを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              「{milestone?.name}」を削除します。この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>
              キャンセル
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading ? "削除中..." : "削除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
