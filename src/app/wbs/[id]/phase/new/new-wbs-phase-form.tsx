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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createWbsPhase } from "@/app/wbs/[id]/wbs-actions";
import { toast } from "@/hooks/use-toast";
import { PhaseTemplate } from "@prisma/client";
import { getPhases } from "@/app/wbs/phase/phase-actions";
import { CirclePlus } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(2, {
    message: "フェーズ名は2文字以上で入力してください。",
  }),
  seq: z.number().min(1, {
    message: "順序は1以上の数値を入力してください。",
  }),
  templateId: z.string().optional(),
});

type NewWbsPhaseFormProps = {
  wbsId: number;
};

export function NewWbsPhaseForm({ wbsId }: NewWbsPhaseFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [templates, setTemplates] = useState<PhaseTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null
  );

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      seq: 1,
      templateId: "",
    },
  });

  useEffect(() => {
    async function fetchTemplates() {
      const templates = await getPhases();
      setTemplates(templates);
    }
    fetchTemplates();
  }, []);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      const result = await createWbsPhase(wbsId, values);
      if (result.success) {
        toast({
          title: "フェーズ作成成功",
          description: "フェーズが作成されました。",
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
        <FormField
          control={form.control}
          name="templateId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>テンプレートから選択</FormLabel>
              <FormControl>
                <Select
                  {...field}
                  onValueChange={(value) => {
                    setSelectedTemplateId(value);
                    if (value !== "new") {
                      const selectedTemplate = templates.find(
                        (template) => template.id === Number(value)
                      );
                      if (selectedTemplate) {
                        form.setValue("name", selectedTemplate.name);
                        form.setValue("seq", selectedTemplate.order);
                      }
                    } else {
                      form.setValue("name", "");
                      form.setValue("seq", 1);
                    }
                    field.onChange(value);
                  }}
                  defaultValue={field.value}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="フェーズを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.length > 0 ? (
                      templates.map((template) => (
                        <SelectItem
                          key={template.id}
                          value={template.id.toString()}
                        >
                          {template.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="loading" disabled>
                        読み込み中...
                      </SelectItem>
                    )}
                    <SelectItem value="new" className="flex items-center gap-2">
                      <CirclePlus className="h-4 w-4" />
                      新規フェーズ作成
                    </SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormDescription>
                既存のテンプレートからフェーズを選択するか、新規作成してください。
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>フェーズ名</FormLabel>
              <FormControl>
                <Input
                  placeholder="新規フェーズ"
                  {...(selectedTemplateId !== "new" ? field : {})}
                  disabled={selectedTemplateId !== "new"}
                  required={selectedTemplateId === "new"}
                  onChange={(e) => {
                    form.setValue("name", e.target.value);
                    field.onChange(e.target.value);
                  }}
                />
              </FormControl>
              <FormDescription>
                WBSフェーズの名前を入力してください。
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="seq"
          render={({ field }) => (
            <FormItem>
              <FormLabel>順序</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  {...field}
                  onChange={(e) =>
                    field.onChange(Number.parseInt(e.target.value))
                  }
                />
              </FormControl>
              <FormDescription>
                フェーズの表示順序を入力してください。
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "作成中..." : "フェーズを作成"}
        </Button>
      </form>
    </Form>
  );
}
