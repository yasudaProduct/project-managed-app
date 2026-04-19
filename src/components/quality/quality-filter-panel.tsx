"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Filter, RotateCcw } from "lucide-react";

export interface QualityFilter {
  fromDate: string;
  toDate: string;
  phase: string;
}

interface QualityFilterPanelProps {
  value: QualityFilter;
  onChange: (filter: QualityFilter) => void;
  phases: string[];
}

export function QualityFilterPanel({
  value,
  onChange,
  phases,
}: QualityFilterPanelProps) {
  const reset = () => onChange({ fromDate: "", toDate: "", phase: "" });

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-end gap-4 flex-wrap">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Filter className="h-4 w-4" />
            <span>フィルタ</span>
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="quality-from" className="text-xs">
              開始日
            </Label>
            <Input
              id="quality-from"
              type="date"
              value={value.fromDate}
              onChange={(e) => onChange({ ...value, fromDate: e.target.value })}
              className="w-[160px]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="quality-to" className="text-xs">
              終了日
            </Label>
            <Input
              id="quality-to"
              type="date"
              value={value.toDate}
              onChange={(e) => onChange({ ...value, toDate: e.target.value })}
              className="w-[160px]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="quality-phase" className="text-xs">
              フェーズ
            </Label>
            <select
              id="quality-phase"
              value={value.phase}
              onChange={(e) => onChange({ ...value, phase: e.target.value })}
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm w-[180px]"
            >
              <option value="">すべて</option>
              {phases.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <Button variant="outline" size="sm" onClick={reset}>
            <RotateCcw className="h-4 w-4 mr-1" />
            リセット
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
