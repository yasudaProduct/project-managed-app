"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { addDays } from "date-fns";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DatePicker } from "@/components/date-picker";
import { toast } from "@/hooks/use-toast";
import { formatDate } from "@/utils/date-util";
import type { FreeTimeSearchResultDto } from "@/types/free-time";
import { searchFreeTime } from "../actions";

const MIN_DURATION_OPTIONS = [
  { value: "none", label: "指定なし" },
  { value: "30", label: "30分" },
  { value: "60", label: "1時間" },
  { value: "90", label: "1時間30分" },
  { value: "120", label: "2時間" },
  { value: "180", label: "3時間" },
] as const;

// クライアント側の検証はUX目的。境界防御はServer Action側で再検証する。
const formSchema = z
  .object({
    userIds: z.array(z.string()),
    startDate: z
      .string()
      .regex(/^\d{4}\/\d{2}\/\d{2}$/, {
        message: "開始日は YYYY/MM/DD 形式で入力してください。",
      })
      .or(z.literal("")),
    endDate: z
      .string()
      .regex(/^\d{4}\/\d{2}\/\d{2}$/, {
        message: "終了日は YYYY/MM/DD 形式で入力してください。",
      })
      .or(z.literal("")),
    minDuration: z.enum(["none", "30", "60", "90", "120", "180"]),
  })
  .refine(
    (value) =>
      !value.startDate || !value.endDate || value.startDate <= value.endDate,
    {
      message: "終了日は開始日以降の日付を指定してください",
      path: ["endDate"],
    }
  );

type FreeTimeSearchProps = {
  users: { id: string; name: string; email: string }[];
};

function formatDurationLabel(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}分`;
  if (mins === 0) return `${hours}時間`;
  return `${hours}時間${mins}分`;
}

function formatDateLabel(dateKey: string): string {
  return formatDate(new Date(dateKey), "YYYY/MM/DD(曜)");
}

export function FreeTimeSearch({ users }: FreeTimeSearchProps) {
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] =
    useState<FreeTimeSearchResultDto | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      userIds: [],
      startDate: formatDate(new Date(), "YYYY/MM/DD"),
      endDate: formatDate(addDays(new Date(), 7), "YYYY/MM/DD"),
      minDuration: "none",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSearching(true);
    try {
      const result = await searchFreeTime({
        userIds: values.userIds.length > 0 ? values.userIds : undefined,
        startDate: values.startDate
          ? values.startDate.replaceAll("/", "-")
          : undefined,
        endDate: values.endDate
          ? values.endDate.replaceAll("/", "-")
          : undefined,
        minDurationMinutes:
          values.minDuration === "none"
            ? undefined
            : Number(values.minDuration),
      });

      if (result.success) {
        setSearchResult(result.data);
      } else {
        toast({
          title: "空き時間の検索に失敗しました",
          description: result.error,
          variant: "destructive",
        });
      }
    } finally {
      setIsSearching(false);
    }
  }

  const totalSlotCount =
    searchResult?.days.reduce((count, day) => count + day.slots.length, 0) ?? 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>検索条件</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="userIds"
                render={() => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>対象ユーザー</FormLabel>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            form.setValue(
                              "userIds",
                              users.map((user) => user.id)
                            )
                          }
                        >
                          全選択
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => form.setValue("userIds", [])}
                        >
                          クリア
                        </Button>
                      </div>
                    </div>
                    {users.length === 0 ? (
                      <p className="text-sm text-muted-foreground rounded-md border p-4">
                        ユーザーが登録されていません。
                      </p>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 rounded-md border p-4 max-h-48 overflow-y-auto">
                        {users.map((user) => (
                          <FormField
                            key={user.id}
                            control={form.control}
                            name="userIds"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value.includes(user.id)}
                                    onCheckedChange={(checked) => {
                                      field.onChange(
                                        checked === true
                                          ? [...field.value, user.id]
                                          : field.value.filter(
                                              (id) => id !== user.id
                                            )
                                      );
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-normal cursor-pointer">
                                  {user.name}
                                </FormLabel>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                    )}
                    <FormDescription>
                      未選択の場合は全ユーザーが対象になります。
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>開始日</FormLabel>
                      <DatePicker field={field} />
                      <FormDescription>未入力の場合は今日</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>終了日</FormLabel>
                      <DatePicker field={field} />
                      <FormDescription>
                        未入力の場合は開始日から1週間
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="minDuration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>最低空き時間</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="指定なし" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {MIN_DURATION_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        指定した長さ以上の空き時間のみ表示
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <Button type="submit" disabled={isSearching}>
                <Search className="w-4 h-4 mr-2" />
                {isSearching ? "検索中..." : "検索"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {searchResult && (
        <Card>
          <CardHeader>
            <CardTitle>検索結果</CardTitle>
            <CardDescription className="space-y-2">
              <span className="flex flex-wrap gap-x-6 gap-y-1">
                <span>
                  期間: {formatDateLabel(searchResult.conditions.startDate)} 〜{" "}
                  {formatDateLabel(searchResult.conditions.endDate)}
                </span>
                <span>
                  時間帯: {searchResult.conditions.windowStartTime}〜
                  {searchResult.conditions.windowEndTime}
                </span>
                <span>
                  最低空き時間:{" "}
                  {searchResult.conditions.minDurationMinutes > 0
                    ? `${formatDurationLabel(
                        searchResult.conditions.minDurationMinutes
                      )}以上`
                    : "指定なし"}
                </span>
              </span>
              <span className="flex flex-wrap items-center gap-1">
                <span>対象ユーザー:</span>
                {searchResult.conditions.users.map((user) => (
                  <Badge key={user.id} variant="secondary">
                    {user.name}
                  </Badge>
                ))}
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {searchResult.days.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                条件に合う空き時間が見つかりませんでした
              </p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-2">
                  全員が空いている時間帯: {totalSlotCount}件
                </p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[180px]">日付</TableHead>
                      <TableHead>時間帯</TableHead>
                      <TableHead>空き時間</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {searchResult.days.flatMap((day) =>
                      day.slots.map((slot, slotIndex) => (
                        <TableRow key={`${day.date}-${slot.startTime}`}>
                          <TableCell className="font-medium">
                            {slotIndex === 0 ? formatDateLabel(day.date) : ""}
                          </TableCell>
                          <TableCell>
                            {slot.startTime} 〜 {slot.endTime}
                          </TableCell>
                          <TableCell>
                            {formatDurationLabel(slot.durationMinutes)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
