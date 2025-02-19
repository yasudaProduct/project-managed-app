import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export interface ColumnVisibility {
  phase: boolean;
  wbsno: boolean;
  assignee: boolean;
  yotei: boolean;
  start: boolean;
  end: boolean;
  kosu: boolean;
  status: boolean;
  operation: boolean;
  all: boolean;
}

interface ColumnVisibilityToggleProps {
  columnVisibility: ColumnVisibility;
  onToggle: (column: keyof ColumnVisibility) => void;
}

export function ColumnVisibilityToggle({
  columnVisibility,
  onToggle,
}: ColumnVisibilityToggleProps) {
  return (
    <div className="flex flex-wrap gap-4 mb-4 font-size-sm">
      <div className="flex items-center space-x-4">
        <Switch
          id="column-phase"
          checked={columnVisibility.phase}
          onCheckedChange={() => onToggle("phase")}
          className="w-6 h-3"
        />
        <Label htmlFor="column-phase">工程</Label>
      </div>
      <div className="flex items-center space-x-4">
        <Switch
          id="column-wbsno"
          checked={columnVisibility.wbsno}
          onCheckedChange={() => onToggle("wbsno")}
          className="w-6 h-3"
        />
        <Label htmlFor="column-wbsno">WBSNO</Label>
      </div>
      <div className="flex items-center space-x-4">
        <Switch
          id="column-assignee"
          checked={columnVisibility.assignee}
          onCheckedChange={() => onToggle("assignee")}
          className="w-6 h-3"
        />
        <Label htmlFor="column-assignee">担当</Label>
      </div>
      <div className="flex items-center space-x-4">
        <Switch
          id="column-yotei"
          checked={columnVisibility.yotei}
          onCheckedChange={() => onToggle("yotei")}
          className="w-6 h-3"
        />
        <Label htmlFor="column-yotei">予定</Label>
      </div>
      <div className="flex items-center space-x-4">
        <Switch
          id="column-status"
          checked={columnVisibility.status}
          onCheckedChange={() => onToggle("status")}
          className="w-6 h-3"
        />
        <Label htmlFor="column-status">状況</Label>
      </div>
      <div className="flex items-center space-x-4">
        <Switch
          id="column-all"
          checked={columnVisibility.all}
          onCheckedChange={() => {
            onToggle("all");
          }}
          className="w-6 h-3"
        />
        <Label htmlFor="column-all">全て</Label>
      </div>
    </div>
  );
}
