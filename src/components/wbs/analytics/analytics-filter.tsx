"use client";

import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

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
    selectedWbsId?: number;
    onWbsChange?: (id: number) => void;
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
    selectedWbsId,
    onWbsChange,
    selectedTag,
    onTagChange,
    wbsList,
    tagNames,
}: Props) {
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
                    <Label className="text-xs">WBS</Label>
                    <Select
                        value={selectedWbsId?.toString()}
                        onValueChange={(v) => onWbsChange?.(Number(v))}
                    >
                        <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="WBSを選択" />
                        </SelectTrigger>
                        <SelectContent>
                            {wbsList.map((wbs) => (
                                <SelectItem key={wbs.id} value={wbs.id.toString()}>
                                    {wbs.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
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
