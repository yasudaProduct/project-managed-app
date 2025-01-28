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
import { WbsTasks } from "./data-management-table";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../ui/form";

const formSchema = z.object({
  id: z.string().min(1, {
    message: "WBS IDは必須です。",
  }),
  name: z.string().min(1, {
    message: "タスク名は必須です。",
  }),
  kijunStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
    message: "基準開始日は YYYY-MM-DD 形式で入力してください。",
  }),
  kijunEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
    message: "基準終了日は YYYY-MM-DD 形式で入力してください。",
  }),
  kijunKosu: z.number().min(0, {
    message: "工数は0以上の数値を入力してください。",
  }),
});


interface AddTaskModalProps {
  onAddItem: (newTasks: WbsTasks) => void;
  wbsId: number;
}

export function AddTaskModal({ onAddItem }: AddTaskModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newItem, setNewItem] = useState({ id: "", name: "" });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      id: "",
      name: "",
      kijunStartDate: "",
      kijunEndDate: "",
      kijunKosu: 0,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    onAddItem(values);
    setIsSubmitting(false);
    setNewItem({ id: "", name: "" });
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="mb-4">
          <Plus className="mr-2 h-4 w-4" /> 新規追加
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
                <label htmlFor="wbsId">
                  WBS ID
                </label>
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
                <label htmlFor="name">
                  名前
                </label>
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
                <label htmlFor="kijunStartDate">
                基準開始日
                </label>
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
                <label htmlFor="kijunEndDate">
                基準終了日
                </label>
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
                <label htmlFor="kijunKosu">
                基準工数
                </label>
                <FormField
                  control={form.control}
                  name="kijunKosu"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            <div className="flex justify-end">
              {/* <Button onClick={handleSubmit}>追加</Button> */}
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
