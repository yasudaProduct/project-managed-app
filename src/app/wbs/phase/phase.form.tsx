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
import {
  createPhaseTemplate,
  updatePhase,
} from "@/app/wbs/phase/phase-actions";
import { toast } from "@/hooks/use-toast";
import { updateWbsPhase } from "../[id]/wbs-phase-actions";

const formSchema = z.object({
  name: z.string().min(1, {
    message: "名前は必須です。",
  }),
  code: z.string().min(1, {
    message: "コードは必須です。",
  }),
  seq: z
    .number()
    .min(1, {
      message: "順番は必須です。",
    })
    .refine((value) => !isNaN(value), {
      message: "順番は数値である必要があります。",
    }),
});

type PhaseFormProps = {
  phase?: {
    id: number;
    name: string;
    code: string;
    seq: number;
  };
  wbsId?: number;
};

export function PhaseForm({ phase, wbsId }: PhaseFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: phase || {
      name: "",
      code: "",
      seq: 0,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      if (!wbsId) {
        // 工程テンプレート
        if (phase) {
          // 更新
          const result = await updatePhase(phase.id, values);
          if (result.success) {
            toast({
              title: "更新しました。",
              description: "工程を更新しました。",
            });
            router.push(`/wbs/phase`);
          } else {
            toast({
              title: "エラーが発生しました。",
              description: result.error,
              variant: "destructive",
            });
          }
        } else {
          // 新規
          const result = await createPhaseTemplate(values);
          if (result.success) {
            toast({
              title: "作成しました。",
              description: "工程を作成しました。",
            });
            router.push("/wbs/phase");
          } else {
            toast({
              title: "エラーが発生しました。",
              description: result.error,
              variant: "destructive",
            });
          }
        }
      } else {
        // WBS工程
        if (phase) {
          // 更新
          const result = await updateWbsPhase(phase.id, values);
          if (result.success) {
            toast({
              title: "更新しました。",
              description: "工程を更新しました。",
            });
          } else {
            toast({
              title: "エラーが発生しました。",
              description: result.error,
              variant: "destructive",
            });
          }
        }
      }
      router.refresh();
    } catch (error) {
      toast({
        title: "エラーが発生しました。",
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
              <FormLabel>工程名</FormLabel>
              <FormControl>
                <Input placeholder="工程名" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>コード</FormLabel>
              <FormControl>
                <Input placeholder="コード" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="seq"
          render={({ field }) => (
            <FormItem>
              <FormLabel>順番</FormLabel>
              <FormControl>
                <Input
                  placeholder="1"
                  {...field}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "保存中..." : phase ? "更新" : "作成"}
        </Button>
      </form>
    </Form>
  );
}
