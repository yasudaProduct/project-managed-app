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

interface AddTaskModalProps {
  onAddItem: (newTasks: WbsTasks) => void;
  wbsId: number;
}

export function AddTaskModal({ onAddItem }: AddTaskModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newItem, setNewItem] = useState({ id: "", name: "" });

  const handleSubmit = () => {
    console.log("handleSubmit", newItem);
    if (newItem.name) {
      onAddItem(newItem);
      setNewItem({ id: "", name: "" });
      setIsOpen(false);
    }
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
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="wbsId" className="text-right">
              WBS ID
            </label>
            <Input
              id="id"
              value={newItem.id}
              onChange={(e) => setNewItem({ ...newItem, id: e.target.value })}
              className="col-span-3"
            />
            <label htmlFor="name" className="text-right">
              名前
            </label>
            <Input
              id="name"
              value={newItem.name}
              onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
              className="col-span-3"
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={handleSubmit}>追加</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
