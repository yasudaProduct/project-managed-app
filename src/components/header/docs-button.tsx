"use client";

import { BookOpen } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DocsSidebar } from "./docs-sidebar";
import { resolveDoc } from "./docs-map";

export function DocsButton() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const doc = resolveDoc(pathname);

  if (!doc) {
    return null;
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label="ドキュメントを開く"
        onClick={() => setOpen(true)}
        className="h-7 w-7"
      >
        <BookOpen className="h-4 w-4" />
      </Button>
      <DocsSidebar
        open={open}
        onOpenChange={setOpen}
        docId={doc.docId}
        title={doc.title}
      />
    </>
  );
}
