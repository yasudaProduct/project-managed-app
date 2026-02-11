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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AnalyticsFilter } from "./analytics-filter";
import { getCoefficients } from "@/app/wbs/analytics/actions";
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

type PhaseCoefficient = {
    templateId: number | null;
    phaseName: string;
    phaseCode: string;
    totalHours: number;
    coefficient: number | null;
    wbsCount: number;
    isBase: boolean;
};

type Props = {
    phaseTemplates: PhaseTemplate[];
    wbsList: WbsItem[];
    tagNames: string[];
};

export function CoefficientTable({ phaseTemplates, wbsList, tagNames }: Props) {
    const [filterType, setFilterType] = useState<"wbs" | "all" | "tag">("all");
    const [hoursType, setHoursType] = useState<"planned" | "actual">("planned");
    const [selectedWbsIds, setSelectedWbsIds] = useState<number[]>([]);
    const [selectedTag, setSelectedTag] = useState<string | undefined>(tagNames[0]);
    const [baseTemplateId, setBaseTemplateId] = useState<number>(phaseTemplates[0]?.id ?? 0);
    const [data, setData] = useState<PhaseCoefficient[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const result = await getCoefficients({
                filterType,
                wbsIds: filterType === "wbs" ? selectedWbsIds : undefined,
                tagNames: filterType === "tag" && selectedTag ? [selectedTag] : undefined,
                baseTemplateId,
                hoursType,
            });
            setData(result);
        } catch {
            setData([]);
        } finally {
            setIsLoading(false);
        }
    }, [filterType, hoursType, selectedWbsIds, selectedTag, baseTemplateId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

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

            <div className="space-y-1">
                <Label className="text-xs">基準工程</Label>
                <Select
                    value={baseTemplateId.toString()}
                    onValueChange={(v) => setBaseTemplateId(Number(v))}
                >
                    <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="基準工程を選択" />
                    </SelectTrigger>
                    <SelectContent>
                        {phaseTemplates.map((t) => (
                            <SelectItem key={t.id} value={t.id.toString()}>
                                {t.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
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
                            <TableHead className="text-right">係数</TableHead>
                            <TableHead className="text-right">WBS数</TableHead>
                            <TableHead>備考</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.map((row) => (
                            <TableRow key={row.phaseCode} className={row.isBase ? "bg-muted/50" : ""}>
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
                                    {row.coefficient !== null ? row.coefficient.toFixed(2) : "-"}
                                </TableCell>
                                <TableCell className="text-right">{row.wbsCount}</TableCell>
                                <TableCell>
                                    {row.isBase && <Badge variant="outline">基準</Badge>}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}
        </div>
    );
}
