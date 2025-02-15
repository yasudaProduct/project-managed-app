"use client";

import { useForm } from "react-hook-form";
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

const formSchema = z.object({
  name: z.string().min(1, {
    message: "タスク名を入力して下さい",
  }),
  assignee: z.string().min(1, {
    message: "担当者を入力して下さい",
  }),
});

type EditDialogProps = {
  children: React.ReactNode;
  task: Task;
};

export default function EditDialog({ children, task }: EditDialogProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: task?.name,
      assignee: task?.assignee,
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values);
  }

  // 親コンポーネントや他のリスナーがこのイベントを受け取るのを防ぐ。
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    event.stopPropagation();
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
            <FormField
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
            />
            <Button type="submit">更新</Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
