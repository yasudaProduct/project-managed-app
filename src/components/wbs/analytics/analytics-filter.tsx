"use client";

import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronsUpDown } from "lucide-react";

type FilterType = "wbs" | "all" | "tag";
type HoursType = "planned" | "actual";

type WbsItem = {
    id: number;
    name: string;
};

type Props = {
    filterType: FilterType;
    onFilterTypeChange: (value: FilterType) => void;
    hoursType: HoursType;
    onHoursTypeChange: (value: HoursType) => void;
    selectedWbsIds: number[];
    onWbsChange?: (ids: number[]) => void;
    selectedTag?: string;
    onTagChange?: (tag: string) => void;
    wbsList: WbsItem[];
    tagNames: string[];
};

export function AnalyticsFilter({
    filterType,
    onFilterTypeChange,
    hoursType,
    onHoursTypeChange,
    selectedWbsIds,
    onWbsChange,
    selectedTag,
    onTagChange,
    wbsList,
    tagNames,
}: Props) {
    const toggleWbs = (id: number) => {
        if (!onWbsChange) return;
        if (selectedWbsIds.includes(id)) {
            onWbsChange(selectedWbsIds.filter((wid) => wid !== id));
        } else {
            onWbsChange([...selectedWbsIds, id]);
        }
    };

    return (
        <div className="flex flex-wrap items-end gap-4 rounded-lg border p-4">
            <div className="space-y-1">
                <Label className="text-xs">フィルタ</Label>
                <Select value={filterType} onValueChange={(v) => onFilterTypeChange(v as FilterType)}>
                    <SelectTrigger className="w-[140px]">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">全体</SelectItem>
                        <SelectItem value="wbs">選択WBS</SelectItem>
                        <SelectItem value="tag">類似案件</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {filterType === "wbs" && (
                <div className="space-y-1">
                    <Label className="text-xs">WBS（複数選択可）</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className="w-[280px] justify-between font-normal"
                            >
                                {selectedWbsIds.length === 0
                                    ? "WBSを選択"
                                    : `${selectedWbsIds.length}件選択中`}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[280px] p-2" align="start">
                            <div className="max-h-[240px] overflow-y-auto space-y-1">
                                {wbsList.map((wbs) => (
                                    <label
                                        key={wbs.id}
                                        className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent cursor-pointer"
                                    >
                                        <Checkbox
                                            checked={selectedWbsIds.includes(wbs.id)}
                                            onCheckedChange={() => toggleWbs(wbs.id)}
                                        />
                                        <span className="truncate">{wbs.name}</span>
                                    </label>
                                ))}
                            </div>
                        </PopoverContent>
                    </Popover>
                    {selectedWbsIds.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                            {selectedWbsIds.map((id) => {
                                const wbs = wbsList.find((w) => w.id === id);
                                return wbs ? (
                                    <Badge
                                        key={id}
                                        variant="secondary"
                                        className="text-xs cursor-pointer"
                                        onClick={() => toggleWbs(id)}
                                    >
                                        {wbs.name} ×
                                    </Badge>
                                ) : null;
                            })}
                        </div>
                    )}
                </div>
            )}

            {filterType === "tag" && (
                <div className="space-y-1">
                    <Label className="text-xs">類似案件タグ</Label>
                    <Select value={selectedTag} onValueChange={(v) => onTagChange?.(v)}>
                        <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="タグを選択" />
                        </SelectTrigger>
                        <SelectContent>
                            {tagNames.map((tag) => (
                                <SelectItem key={tag} value={tag}>
                                    {tag}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}

            <div className="space-y-1">
                <Label className="text-xs">工数種別</Label>
                <Select value={hoursType} onValueChange={(v) => onHoursTypeChange(v as HoursType)}>
                    <SelectTrigger className="w-[140px]">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="planned">予定(YOTEI)</SelectItem>
                        <SelectItem value="actual">実績(JISSEKI)</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
}
