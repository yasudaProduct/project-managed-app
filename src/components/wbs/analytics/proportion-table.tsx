"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { AnalyticsFilter } from "./analytics-filter";
import { getProportions } from "@/app/wbs/analytics/actions";
import { Loader2 } from "lucide-react";

type PhaseTemplate = {
    id: number;
    name: string;
    code: string;
    seq: number;
};

type WbsItem = {
    id: number;
    name: string;
    projectId: string;
};

type PhaseProportion = {
    templateId: number | null;
    phaseName: string;
    phaseCode: string;
    totalHours: number;
    proportion: number;
    customProportion?: number | null;
};

type Props = {
    phaseTemplates: PhaseTemplate[];
    wbsList: WbsItem[];
    tagNames: string[];
};

function formatPercent(value: number | null | undefined): string {
    if (value === null || value === undefined) return "-";
    return `${(value * 100).toFixed(1)}%`;
}

export function ProportionTable({ phaseTemplates, wbsList, tagNames }: Props) {
    const [filterType, setFilterType] = useState<"wbs" | "all" | "tag">("all");
    const [hoursType, setHoursType] = useState<"planned" | "actual">("planned");
    const [selectedWbsIds, setSelectedWbsIds] = useState<number[]>([]);
    const [selectedTag, setSelectedTag] = useState<string | undefined>(tagNames[0]);
    const [customBaseIds, setCustomBaseIds] = useState<number[]>([]);
    const [data, setData] = useState<PhaseProportion[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const result = await getProportions({
                filterType,
                wbsIds: filterType === "wbs" ? selectedWbsIds : undefined,
                tagNames: filterType === "tag" && selectedTag ? [selectedTag] : undefined,
                hoursType,
                customBaseTemplateIds: customBaseIds.length > 0 ? customBaseIds : undefined,
            });
            setData(result);
        } catch {
            setData([]);
        } finally {
            setIsLoading(false);
        }
    }, [filterType, hoursType, selectedWbsIds, selectedTag, customBaseIds]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const toggleCustomBase = (templateId: number) => {
        setCustomBaseIds((prev) =>
            prev.includes(templateId)
                ? prev.filter((id) => id !== templateId)
                : [...prev, templateId]
        );
    };

    const grandTotal = data.reduce((sum, d) => sum + d.totalHours, 0);

    return (
        <div className="space-y-4">
            <AnalyticsFilter
                filterType={filterType}
                onFilterTypeChange={setFilterType}
                hoursType={hoursType}
                onHoursTypeChange={setHoursType}
                selectedWbsIds={selectedWbsIds}
                onWbsChange={setSelectedWbsIds}
                selectedTag={selectedTag}
                onTagChange={setSelectedTag}
                wbsList={wbsList}
                tagNames={tagNames}
            />

            <div className="space-y-2">
                <Label className="text-xs">カスタム母数（チェックした工程の合計を母数とする）</Label>
                <div className="flex flex-wrap gap-3">
                    {phaseTemplates.map((t) => (
                        <label key={t.id} className="flex items-center gap-1.5 text-sm">
                            <Checkbox
                                checked={customBaseIds.includes(t.id)}
                                onCheckedChange={() => toggleCustomBase(t.id)}
                            />
                            {t.name}
                        </label>
                    ))}
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                </div>
            ) : data.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">データがありません</p>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>工程</TableHead>
                            <TableHead className="text-right">合計工数</TableHead>
                            <TableHead className="text-right">全体割合</TableHead>
                            <TableHead className="w-[200px]">グラフ</TableHead>
                            {customBaseIds.length > 0 && (
                                <TableHead className="text-right">対母数割合</TableHead>
                            )}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.map((row) => (
                            <TableRow key={row.phaseCode}>
                                <TableCell className="font-medium">
                                    {row.phaseName}
                                    {row.templateId === null && (
                                        <span className="ml-1 text-xs text-muted-foreground">(未分類)</span>
                                    )}
                                </TableCell>
                                <TableCell className="text-right">
                                    {row.totalHours.toFixed(1)}h
                                </TableCell>
                                <TableCell className="text-right font-mono">
                                    {formatPercent(row.proportion)}
                                </TableCell>
                                <TableCell>
                                    <div className="h-4 w-full rounded bg-muted">
                                        <div
                                            className="h-full rounded bg-primary/60"
                                            style={{ width: `${Math.min(row.proportion * 100, 100)}%` }}
                                        />
                                    </div>
                                </TableCell>
                                {customBaseIds.length > 0 && (
                                    <TableCell className="text-right font-mono">
                                        {formatPercent(row.customProportion)}
                                    </TableCell>
                                )}
                            </TableRow>
                        ))}
                        <TableRow className="border-t-2 font-bold">
                            <TableCell>合計</TableCell>
                            <TableCell className="text-right">{grandTotal.toFixed(1)}h</TableCell>
                            <TableCell className="text-right">100%</TableCell>
                            <TableCell />
                            {customBaseIds.length > 0 && <TableCell />}
                        </TableRow>
                    </TableBody>
                </Table>
            )}
        </div>
    );
}
