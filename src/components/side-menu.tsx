"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Button } from "./ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";

export function SideMenu() {
  // const [isOpen, setIsOpen] = useState(false);

  return (
    // <Sheet open={isOpen} onOpenChange={setIsOpen}>
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="fixed top-4 left-4 z-40"
        >
          <Menu className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[240px] sm:w-[300px]">
        <SheetHeader>
          <SheetTitle>menu</SheetTitle>
          <SheetDescription>menu</SheetDescription>
        </SheetHeader>
        <nav className="flex flex-col space-y-4">
          <Link
            href="/"
            className="text-lg font-semibold"
            // onClick={() => setIsOpen(false)}
          >
            ホーム
          </Link>
          <Link
            href="/projects"
            className="text-lg"
            // onClick={() => setIsOpen(false)}
          >
            プロジェクト
          </Link>
          <Link
            href="/tasks"
            className="text-lg"
            // onClick={() => setIsOpen(false)}
          >
            タスク
          </Link>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
