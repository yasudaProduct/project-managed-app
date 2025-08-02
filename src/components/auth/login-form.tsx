"use client";

import { useState } from "react";
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
import { loginAction } from "@/app/(auth)/login/login-actions";
import Link from "next/link";
import { useRouter } from "next/navigation";
const loginSchema = z.object({
  email: z.string().email("有効なメールアドレスを入力してください"),
  password: z.string().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(data: LoginFormData) {
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("email", data.email);
      if (data.password) {
        formData.append("password", data.password);
      }

      const result = await loginAction(formData);

      if (result.success) {
        toast({
          title: "ログインしました",
          description: "ダッシュボードにリダイレクトします",
        });
        router.push("/dashboard");
      } else {
        toast({
          title: "ログインに失敗しました",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error(error);
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
                <FormLabel>メールアドレス</FormLabel>
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
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>パスワード（任意）</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="パスワードが設定されている場合のみ入力"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "ログイン中..." : "ログイン"}
          </Button>
        </form>
      </Form>

      <div className="text-center">
        <p className="text-sm text-gray-600">
          アカウントをお持ちでない場合は{" "}
          <Link href="/auth/register" className="text-blue-600 hover:underline">
            新規登録
          </Link>
        </p>
      </div>
    </div>
  );
}
