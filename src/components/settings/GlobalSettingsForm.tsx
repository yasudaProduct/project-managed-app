'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  dailyWorkingHours: z
    .string()
    .transform((val) => parseFloat(val))
    .pipe(z.number().min(0.5, '0.5時間以上を入力してください').max(24, '24時間以下を入力してください'))
});

type FormData = z.infer<typeof formSchema>;

export function GlobalSettingsForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      dailyWorkingHours: 7.5
    }
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/settings/global');
        if (response.ok) {
          const data = await response.json();
          form.reset({
            dailyWorkingHours: data.dailyWorkingHours
          });
        }
      } catch (error) {
        console.error('設定の取得に失敗しました:', error);
        toast({
          title: 'エラー',
          description: '設定の取得に失敗しました',
          variant: 'destructive'
        });
      } finally {
        setIsFetching(false);
      }
    };

    fetchSettings();
  }, [form]);

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/settings/global', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error('設定の更新に失敗しました');
      }

      toast({
        title: '成功',
        description: '設定を更新しました'
      });
    } catch (error) {
      console.error('設定の更新に失敗しました:', error);
      toast({
        title: 'エラー',
        description: '設定の更新に失敗しました',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>基本設定</CardTitle>
        <CardDescription>
          プロジェクト全体に適用される設定を管理します
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="dailyWorkingHours"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>勤務時間（日）</FormLabel>
                  <FormControl>
                    <div className="flex items-center space-x-2">
                      <Input
                        type="number"
                        step="0.5"
                        min="0.5"
                        max="24"
                        {...field}
                        className="w-32"
                      />
                      <span className="text-sm text-muted-foreground">時間</span>
                    </div>
                  </FormControl>
                  <FormDescription>
                    1日あたりの標準勤務時間を設定します。
                    この値は工数計算やスケジュール生成で使用されます。
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              保存
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}