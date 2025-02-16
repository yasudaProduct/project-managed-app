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
    <div className="flex flex-wrap gap-4 mb-4">
      <div className="flex items-center space-x-2">
        <Switch
          id="column-phase"
          checked={columnVisibility.phase}
          onCheckedChange={() => onToggle("phase")}
        />
        <Label htmlFor="column-phase">工程</Label>
      </div>
      <div className="flex items-center space-x-2">
        <Switch
          id="column-wbsno"
          checked={columnVisibility.wbsno}
          onCheckedChange={() => onToggle("wbsno")}
        />
        <Label htmlFor="column-wbsno">WBSNO</Label>
      </div>
      <div className="flex items-center space-x-2">
        <Switch
          id="column-assignee"
          checked={columnVisibility.assignee}
          onCheckedChange={() => onToggle("assignee")}
        />
        <Label htmlFor="column-assignee">担当</Label>
      </div>
      <div className="flex items-center space-x-2">
        <Switch
          id="column-yotei"
          checked={columnVisibility.yotei}
          onCheckedChange={() => onToggle("yotei")}
        />
        <Label htmlFor="column-yotei">予定</Label>
      </div>
      <div className="flex items-center space-x-2">
        <Switch
          id="column-status"
          checked={columnVisibility.status}
          onCheckedChange={() => onToggle("status")}
        />
        <Label htmlFor="column-status">状況</Label>
      </div>
    </div>
  );
}
