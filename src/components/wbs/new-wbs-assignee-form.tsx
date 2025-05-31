"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createWbsAssignee,
  updateWbsAssignee,
} from "@/app/wbs/[id]/wbs-actions";
import { toast } from "@/hooks/use-toast";
import { getUsers } from "@/app/users/user-actions";
import { User } from "@/app/users/columns";
import { Input } from "../ui/input";

const formSchema = z.object({
  assigneeId: z.string().nonempty("担当者を選択してください。"),
  rate: z.number().min(0).max(100).default(100),
});

type NewWbsAssigneeFormProps = {
  wbsId: number;
  assignee?: {
    id: number;
    assigneeId: string;
    name: string;
    rate: number;
  };
};

export function NewWbsAssigneeForm({
  wbsId,
  assignee,
}: NewWbsAssigneeFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [users, setUsers] = useState<User[]>([]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: assignee
      ? {
          assigneeId: assignee.assigneeId,
          rate: assignee.rate * 100,
        }
      : {
          assigneeId: "",
          rate: 1,
        },
  });

  useEffect(() => {
    async function fetchUsers() {
      const users = await getUsers();
      setUsers(users);
    }
    fetchUsers();
  }, []);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      const result = assignee
        ? await updateWbsAssignee(
            Number(assignee.id),
            values.assigneeId,
            values.rate
          )
        : await createWbsAssignee(wbsId, values.assigneeId, values.rate);
      if (result.success) {
        toast({
          title: assignee ? "担当者更新成功" : "担当者追加成功",
          description: assignee
            ? "担当者が更新されました。"
            : "担当者が追加されました。",
        });
        router.push(`/wbs/${wbsId}`);
        router.refresh();
      } else {
        toast({
          title: "エラー",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "エラー",
        description: error instanceof Error ? error.message : "不明なエラー",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {assignee ? (
          <FormField
            control={form.control}
            name="assigneeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>担当者</FormLabel>
                <FormControl>
                  <Input {...field} value={assignee.name} disabled />
                </FormControl>
              </FormItem>
            )}
          />
        ) : (
          <FormField
            control={form.control}
            name="assigneeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>担当者を選択</FormLabel>
                <FormControl>
                  <Select {...field} onValueChange={field.onChange}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="担当者を選択" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.length > 0 ? (
                        users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.id} | {user.name} | {user.displayName}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="loading" disabled>
                          読み込み中...
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormDescription>
                  WBSに追加する担当者を選択してください。
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <FormField
          control={form.control}
          name="rate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>割合(%)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  {...field}
                  value={field.value}
                  min={0}
                  max={100}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                />
              </FormControl>
              <FormDescription>
                担当者の割合を入力してください。
              </FormDescription>
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? "追加中..."
            : assignee
            ? "担当者を更新"
            : "担当者を追加"}
        </Button>
      </form>
    </Form>
  );
}
