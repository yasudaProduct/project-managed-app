"use client";

import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Props {
  count: number;
}

export function UnlinkedWorkRecordsBadge({ count }: Props) {
  if (count === 0) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="destructive"
            tabIndex={0}
            className="cursor-default"
          >
            {count}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>未紐付けの実績が{count}件あります</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
