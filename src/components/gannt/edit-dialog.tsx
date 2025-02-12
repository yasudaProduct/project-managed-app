"use client";

import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel } from "../ui/form";
import { Input } from "../ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "../ui/button";
import { Task } from "gantt-task-react";

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

  return (
    <Popover modal={true}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="end">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>タスク名</FormLabel>
                  <FormControl>
                    <Input placeholder="タスク名" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="assignee"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>担当</FormLabel>
                  <FormControl>
                    <Input placeholder="担当者" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <Button type="submit">更新</Button>
          </form>
        </Form>
      </PopoverContent>
    </Popover>
  );
}
