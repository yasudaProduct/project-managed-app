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
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { createUser, updateUser } from "@/app/users/actions";

const formSchema = z.object({
  id: z.string().min(1, {
    message: "IDは必須です。",
  }),
  name: z.string().min(1, {
    message: "名前は必須です。",
  }),
  email: z.string().email({
    message: "有効なメールアドレスを入力してください。",
  }),
  displayName: z.string().min(1, {
    message: "表示名は必須です。",
  }),
  costPerHour: z.number().min(0, {
    message: "人員原価は0以上の数値を入力してください。",
  }),
});

type UserFormProps = {
  user?: {
    id: string;
    name: string;
    email: string;
    displayName: string;
    costPerHour: number;
  };
  systemSettings?: {
    defaultCostPerHour: number;
  };
};

export function UserForm({ user, systemSettings }: UserFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const defaultCostPerHour = systemSettings?.defaultCostPerHour || 0;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: user || {
      id: "",
      name: "",
      email: "",
      displayName: "",
      costPerHour: defaultCostPerHour,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      if (user) {
        await updateUser(user.id, values);
        router.push(`/users/${user.id}`);
      } else {
        await createUser(values);
        router.push("/users");
      }
      router.refresh();
    } catch (error) {
      console.error("Failed to save user:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {!user && (
          <FormField
            control={form.control}
            name="id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>ID</FormLabel>
                <FormControl>
                  <Input placeholder="XXXXXX_XXXXXX" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>名前</FormLabel>
              <FormControl>
                <Input placeholder="山田 太郎" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>メールアドレス</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="taro.yamada@example.com"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="displayName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>表示名</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="costPerHour"
          render={({ field }) => (
            <FormItem>
              <FormLabel>人員原価（円/時間）</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="100"
                  min="0"
                  {...field}
                  onChange={(e) => field.onChange(parseFloat(e.target.value))}
                />
              </FormControl>
              <FormDescription>
                {!user &&
                  `デフォルト値: ${defaultCostPerHour}円（システム設定より）`}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "保存中..." : user ? "更新" : "作成"}
        </Button>
      </form>
    </Form>
  );
}
