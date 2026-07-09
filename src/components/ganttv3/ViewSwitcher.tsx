import { Button } from "../ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { BarChart3, Table2 } from "lucide-react";

interface ViewSwitcherProps {
  currentView?: "gantt" | "table";
  onViewChange: (view: "gantt" | "table") => void;
}

export const ViewSwitcher = ({
  currentView = "gantt",
  onViewChange,
}: ViewSwitcherProps) => {
  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex items-center bg-muted p-1 rounded-sm">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={currentView === "gantt" ? "default" : "ghost"}
              size="sm"
              onClick={() => onViewChange("gantt")}
              className="gap-2"
            >
              <BarChart3 className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>ガント表示</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={currentView === "table" ? "default" : "ghost"}
              size="sm"
              onClick={() => onViewChange("table")}
              className="gap-2"
            >
              <Table2 className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>テーブル表示</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
};
