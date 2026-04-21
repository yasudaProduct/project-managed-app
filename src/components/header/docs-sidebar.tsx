"use client";

import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MarkdownRenderer } from "./markdown-renderer";

interface DocsSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  docId: string;
  title: string;
}

export function DocsSidebar({
  open,
  onOpenChange,
  docId,
  title,
}: DocsSidebarProps) {
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setMarkdown(null);

    fetch(`/api/docs/${docId}`)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`ドキュメントの取得に失敗しました (HTTP ${res.status})`);
        }
        return res.text();
      })
      .then((text) => {
        if (!cancelled) {
          setMarkdown(text);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "不明なエラー");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open, docId]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl flex flex-col p-0"
      >
        <SheetHeader className="p-6 pb-3 border-b">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>この画面の使い方ドキュメント</SheetDescription>
        </SheetHeader>
        <ScrollArea className="flex-1 px-6 py-4">
          {loading && (
            <p className="text-sm text-gray-500">読み込み中...</p>
          )}
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
          {markdown && <MarkdownRenderer markdown={markdown} />}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
