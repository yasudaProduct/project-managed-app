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
import { toast } from "@/hooks/use-toast";
import { registerAction } from "@/app/(auth)/login/login-actions";
import Link from "next/link";

const registerSchema = z.object({
  email: z.string().email("有効なメールアドレスを入力してください"),
  name: z.string().min(1, "名前を入力してください"),
  displayName: z.string().min(1, "表示名を入力してください"),
  password: z.string().optional(),
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterForm() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      name: "",
      displayName: "",
      password: "",
    },
  });

  async function onSubmit(data: RegisterFormData) {
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append("email", data.email);
      formData.append("name", data.name);
      formData.append("displayName", data.displayName);
      if (data.password) {
        formData.append("password", data.password);
      }

      const result = await registerAction(formData);

      if (result.success) {
        toast({
          title: "登録が完了しました",
          description: "ダッシュボードにリダイレクトします",
        });
        router.push("/dashboard");
      } else {
        toast({
          title: "登録に失敗しました",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "エラーが発生しました",
        description: "しばらく時間をおいてから再度お試しください",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>メールアドレス *</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="user@example.com"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>名前 *</FormLabel>
                <FormControl>
                  <Input placeholder="山田太郎" {...field} />
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
                <FormLabel>表示名 *</FormLabel>
                <FormControl>
                  <Input placeholder="太郎" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>パスワード（任意）</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="パスワードを設定する場合は入力"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "登録中..." : "アカウント作成"}
          </Button>
        </form>
      </Form>

      <div className="text-center">
        <p className="text-sm text-gray-600">
          既にアカウントをお持ちの場合は{" "}
          <Link href="/auth/login" className="text-blue-600 hover:underline">
            ログイン
          </Link>
        </p>
      </div>
    </div>
  );
}
