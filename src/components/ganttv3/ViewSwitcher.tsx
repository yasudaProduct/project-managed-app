import { Button } from "../ui/button";
import { BarChart3, Table2 } from "lucide-react";

interface ViewSwitcherProps {
  currentView: "gantt" | "table";
  onViewChange: (view: "gantt" | "table") => void;
}

export const ViewSwitcher = ({
  currentView,
  onViewChange,
}: ViewSwitcherProps) => {
  return (
    <div className="flex items-center bg-muted p-1 rounded-sm">
      <Button
        variant={currentView === "gantt" ? "default" : "ghost"}
        size="sm"
        onClick={() => onViewChange("gantt")}
        className="gap-2"
      >
        <BarChart3 className="w-4 h-4" />
      </Button>
      <Button
        variant={currentView === "table" ? "default" : "ghost"}
        size="sm"
        onClick={() => onViewChange("table")}
        className="gap-2"
      >
        <Table2 className="w-4 h-4" />
      </Button>
    </div>
  );
};
