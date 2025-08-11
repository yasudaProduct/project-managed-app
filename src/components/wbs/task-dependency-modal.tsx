"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
} from "../ui/form";
import { toast } from "@/hooks/use-toast";
import { Trash2, Plus } from "lucide-react";

const dependencySchema = z.object({
  predecessorTaskId: z.string().min(1, "先行タスクを選択してください"),
  successorTaskId: z.string().min(1, "後続タスクを選択してください"),
}).refine((data) => data.predecessorTaskId !== data.successorTaskId, {
  message: "同じタスクを選択することはできません",
  path: ["successorTaskId"],
});

interface Task {
  id: number;
  taskNo: string;
  name: string;
}

interface TaskDependency {
  id: number;
  predecessorTaskId: number;
  successorTaskId: number;
  wbsId: number;
}

interface TaskDependencyModalProps {
  wbsId: number;
  tasks: Task[];
  onDependencyChange?: () => void;
}

export function TaskDependencyModal({
  wbsId,
  tasks,
  onDependencyChange,
}: TaskDependencyModalProps) {
  const [open, setOpen] = useState(false);
  const [dependencies, setDependencies] = useState<TaskDependency[]>([]);
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof dependencySchema>>({
    resolver: zodResolver(dependencySchema),
    defaultValues: {
      predecessorTaskId: "",
      successorTaskId: "",
    },
  });

  const fetchDependencies = useCallback(async () => {
    try {
      const response = await fetch(`/api/wbs/${wbsId}/tasks/dependencies`);
      if (response.ok) {
        const data = await response.json();
        setDependencies(data.dependencies);
      }
    } catch (error) {
      console.error("Error fetching dependencies:", error);
    }
  }, [wbsId]);

  useEffect(() => {
    if (open) {
      fetchDependencies();
    }
  }, [open, wbsId, fetchDependencies]);

  const onSubmit = async (values: z.infer<typeof dependencySchema>) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/wbs/${wbsId}/tasks/dependencies`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          predecessorTaskId: parseInt(values.predecessorTaskId),
          successorTaskId: parseInt(values.successorTaskId),
        }),
      });

      if (response.ok) {
        toast({
          title: "成功",
          description: "タスク依存関係を作成しました",
        });
        form.reset();
        await fetchDependencies();
        onDependencyChange?.();
      } else {
        const errorData = await response.json();
        toast({
          title: "エラー",
          description: errorData.error || "依存関係の作成に失敗しました",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "エラー",
        description: "依存関係の作成に失敗しました",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDependency = async (dependencyId: number) => {
    try {
      const response = await fetch(
        `/api/wbs/${wbsId}/tasks/dependencies/${dependencyId}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        toast({
          title: "成功",
          description: "依存関係を削除しました",
        });
        await fetchDependencies();
        onDependencyChange?.();
      } else {
        const errorData = await response.json();
        toast({
          title: "エラー",
          description: errorData.error || "依存関係の削除に失敗しました",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "エラー",
        description: "依存関係の削除に失敗しました",
        variant: "destructive",
      });
    }
  };

  const getTaskName = (taskId: number) => {
    const task = tasks.find((t) => t.id === taskId);
    return task ? `${task.taskNo} ${task.name}` : `タスクID: ${taskId}`;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="mr-2 h-4 w-4" />
          依存関係管理
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>タスク依存関係の管理</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 新規依存関係作成フォーム */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">新しい依存関係を追加</h3>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="predecessorTaskId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>先行タスク</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="先行タスクを選択" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {tasks.map((task) => (
                              <SelectItem
                                key={task.id}
                                value={task.id.toString()}
                              >
                                {task.taskNo} {task.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="successorTaskId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>後続タスク</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="後続タスクを選択" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {tasks.map((task) => (
                              <SelectItem
                                key={task.id}
                                value={task.id.toString()}
                              >
                                {task.taskNo} {task.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Button type="submit" disabled={loading}>
                  {loading ? "作成中..." : "依存関係を追加"}
                </Button>
              </form>
            </Form>
          </div>

          {/* 既存の依存関係一覧 */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">既存の依存関係</h3>
            {dependencies.length === 0 ? (
              <p className="text-gray-500">依存関係が設定されていません。</p>
            ) : (
              <div className="space-y-2">
                {dependencies.map((dependency) => (
                  <div
                    key={dependency.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                  >
                    <div className="flex-1">
                      <span className="text-sm">
                        {getTaskName(dependency.predecessorTaskId)} →{" "}
                        {getTaskName(dependency.successorTaskId)}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteDependency(dependency.id)}
                      className="ml-2"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            閉じる
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}