import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export interface ColumnVisibility {
  wbsno: boolean;
  tanto: boolean;
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
          id="column-wbsno"
          checked={columnVisibility.wbsno}
          onCheckedChange={() => onToggle("wbsno")}
        />
        <Label htmlFor="column-wbsno">WBSNO</Label>
      </div>
      <div className="flex items-center space-x-2">
        <Switch
          id="column-tanto"
          checked={columnVisibility.tanto}
          onCheckedChange={() => onToggle("tanto")}
        />
        <Label htmlFor="column-tanto">担当</Label>
      </div>
      <div className="flex items-center space-x-2">
        <Switch
          id="column-start"
          checked={columnVisibility.start}
          onCheckedChange={() => onToggle("start")}
        />
        <Label htmlFor="column-start">開始日</Label>
      </div>
      <div className="flex items-center space-x-2">
        <Switch
          id="column-end"
          checked={columnVisibility.end}
          onCheckedChange={() => onToggle("end")}
        />
        <Label htmlFor="column-end">終了日</Label>
      </div>
      <div className="flex items-center space-x-2">
        <Switch
          id="column-kosu"
          checked={columnVisibility.kosu}
          onCheckedChange={() => onToggle("kosu")}
        />
        <Label htmlFor="column-kosu">工数</Label>
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
