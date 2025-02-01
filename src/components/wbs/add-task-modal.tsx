import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "../ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { getTaskStatusName } from "@/lib/utils";
import { WbsTask } from "@/types/wbs";

const formSchema = z.object({
  id: z.string().min(1, {
    message: "WBS IDは必須です。",
  }),
  name: z.string().min(1, {
    message: "タスク名は必須です。",
  }),
  assigneeId: z.string().min(1, {
    message: "担当者は必須です。",
  }),
  kijunStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
    message: "基準開始日は YYYY-MM-DD 形式で入力してください。",
  }),
  kijunEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
    message: "基準終了日は YYYY-MM-DD 形式で入力してください。",
  }),
  kijunKosu: z.preprocess(
    (val) => Number(val),
    z.number().min(0, {
      message: "工数は0以上の数値を入力してください。",
    })
  ),
  yoteiStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
    message: "予定開始日は YYYY-MM-DD 形式で入力してください。",
  }),
  yoteiEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
    message: "予定基準終了日は YYYY-MM-DD 形式で入力してください。",
  }),
  yoteiKosu: z.preprocess(
    (val) => Number(val),
    z.number().min(0, {
      message: "工数は0以上の数値を入力してください。",
    })
  ),
  jissekiStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
    message: "実績開始日は YYYY-MM-DD 形式で入力してください。",
  }),
  jissekiEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
    message: "実績終了日は YYYY-MM-DD 形式で入力してください。",
  }),
  jissekiKosu: z.preprocess(
    (val) => Number(val),
    z.number().min(0, {
      message: "工数は0以上の数値を入力してください。",
    })
  ),
  status: z.enum(["NOT_STARTED", "IN_PROGRESS", "COMPLETED"] as const, {
    message: "有効なタスクステータスを選択してください。",
  }),
  phaseId: z.preprocess(
    (val) => Number(val),
    z.number().min(0, {
      message: "フェーズは必須です。",
    })
  ),
});

interface AddTaskModalProps {
  onAddItem: (newTasks: WbsTask) => void;
  wbsId: number;
  assigneeList: { id: string; name: string }[];
  phases: { id: number; name: string; seq: number }[];
}

export function AddTaskModal({
  onAddItem,
  assigneeList,
  phases,
}: AddTaskModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      id: "",
      name: "",
      assigneeId: "",
      kijunStartDate: "",
      kijunEndDate: "",
      kijunKosu: 0,
      yoteiStartDate: "",
      yoteiEndDate: "",
      yoteiKosu: 0,
      jissekiStartDate: "",
      jissekiEndDate: "",
      jissekiKosu: 0,
      status: "NOT_STARTED",
      phaseId: 0,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    onAddItem({
      id: values.id,
      name: values.name,
      periods: [
        {
          startDate: new Date(values.kijunStartDate),
          endDate: new Date(values.kijunEndDate),
          type: "KIJUN",
          kosus: [
            {
              kosu: values.kijunKosu,
              type: "NORMAL",
            },
          ],
        },
        {
          startDate: new Date(values.yoteiStartDate),
          endDate: new Date(values.yoteiEndDate),
          type: "YOTEI",
          kosus: [
            {
              kosu: values.yoteiKosu,
              type: "NORMAL",
            },
          ],
        },
        {
          startDate: new Date(values.jissekiStartDate),
          endDate: new Date(values.jissekiEndDate),
          type: "JISSEKI",
          kosus: [
            {
              kosu: values.jissekiKosu,
              type: "NORMAL",
            },
          ],
        },
      ],
      status: values.status,
      assigneeId: values.assigneeId,
      phaseId: values.phaseId,
    });
    setIsSubmitting(false);
    setIsOpen(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="mb-4">
          <Plus className="mr-2 h-4 w-4" /> タスク追加
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新規タスク追加</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid gap-1 py-4">
              <div className="grid grid-cols-2 items-center gap-2">
                <label htmlFor="phaseId">フェーズID</label>
                <FormField
                  control={form.control}
                  name="phaseId"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value.toString()}
                        >
                          <SelectTrigger className="col-span-3">
                            <SelectValue placeholder="フェーズを選択" />
                          </SelectTrigger>
                          <SelectContent>
                            {phases.length > 0 ? (
                              phases.map((phase) => (
                                <SelectItem
                                  key={phase.id}
                                  value={phase.id.toString()}
                                >
                                  {phase.name}
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
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <label htmlFor="wbsId">WBS ID</label>
                <FormField
                  control={form.control}
                  name="id"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input placeholder="D1-0001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <label htmlFor="name">名前</label>
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input placeholder="機能A作成" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <label htmlFor="assigneeId">担当者</label>
                <FormField
                  control={form.control}
                  name="assigneeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <SelectTrigger className="col-span-3">
                            <SelectValue placeholder="担当者を選択" />
                          </SelectTrigger>
                          <SelectContent>
                            {assigneeList.length > 0 ? (
                              assigneeList.map((user) => (
                                <SelectItem key={user.id} value={user.id}>
                                  {user.name}
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
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <label htmlFor="kijunStartDate">基準開始日</label>
                <FormField
                  control={form.control}
                  name="kijunStartDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <label htmlFor="kijunEndDate">基準終了日</label>
                <FormField
                  control={form.control}
                  name="kijunEndDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <label htmlFor="kijunKosu">基準工数</label>
                <FormField
                  control={form.control}
                  name="kijunKosu"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          step="any"
                          placeholder="工数"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <label htmlFor="yoteiStartDate">予定開始日</label>
                <FormField
                  control={form.control}
                  name="yoteiStartDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <label htmlFor="yoteiEndDate">予定終了日</label>
                <FormField
                  control={form.control}
                  name="yoteiEndDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <label htmlFor="yoteiKosu">予定工数</label>
                <FormField
                  control={form.control}
                  name="yoteiKosu"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          step="any"
                          placeholder="工数"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <label htmlFor="jissekiStartDate">実績開始日</label>
                <FormField
                  control={form.control}
                  name="jissekiStartDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <label htmlFor="jissekiEndDate">実績終了日</label>
                <FormField
                  control={form.control}
                  name="jissekiEndDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <label htmlFor="jissekiKosu">実績工数</label>
                <FormField
                  control={form.control}
                  name="jissekiKosu"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          step="any"
                          placeholder="工数"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <label htmlFor="status">状況</label>
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <SelectTrigger className="col-span-3">
                            <SelectValue placeholder="ステータスを選択" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem key="NOT_STARTED" value="NOT_STARTED">
                              {getTaskStatusName("NOT_STARTED")}
                            </SelectItem>
                            <SelectItem key="IN_PROGRESS" value="IN_PROGRESS">
                              {getTaskStatusName("IN_PROGRESS")}
                            </SelectItem>
                            <SelectItem key="COMPLETED" value="COMPLETED">
                              {getTaskStatusName("COMPLETED")}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "追加中..." : "追加"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
