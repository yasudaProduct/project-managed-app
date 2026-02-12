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
import { createWbs, updateWbs } from "@/app/wbs/[id]/actions/wbs-actions";
import { toast } from "@/hooks/use-toast";

const formSchema = z.object({
  name: z.string().min(2, {
    message: "WBS名は2文字以上で入力してください。",
  }),
});

type WbsFormProps = {
  projectId: string;
  wbs?: {
    id: number;
    projectId: string;
    name: string;
  };
};

export function WbsForm({ projectId, wbs }: WbsFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: wbs || {
      name: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      if (wbs) {
        const result = await updateWbs(wbs.id, values);
        if (result.success) {
          toast({ title: "WBSを更新しました" });
          router.push(`/projects/${projectId}/wbs`);
          router.refresh();
        } else {
          toast({
            title: "WBSを更新できませんでした",
            description: "エラーが発生しました",
            variant: "destructive",
          });
        }
      } else {
        const result = await createWbs(projectId, values);
        if (result.success) {
          toast({ title: "WBSを作成しました" });
          router.push(`/projects/${projectId}/wbs`);
          router.refresh();
        } else {
          toast({
            title: "WBSを作成できませんでした",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      toast({
        title: "WBSを保存できませんでした",
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
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>WBS名</FormLabel>
              <FormControl>
                <Input placeholder="新規WBS" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "保存中..." : wbs ? "更新" : "作成"}
        </Button>
      </form>
    </Form>
  );
}
