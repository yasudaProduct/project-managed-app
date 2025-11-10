"use client";
import React from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { HoursUnit, convertHours, getUnitSuffix } from "@/utils/hours-converter";

export interface SummaryCell {
    plannedHours: number;
    actualHours: number;
    difference: number; // actual - planned （既存ロジック準拠）
    baselineHours?: number; // 任意: 基準工数
    forecastHours?: number; // 任意: 見通し工数
}

interface MonthlySummaryTableProps {
    months: string[];
    rows: string[]; // 行キー（担当者名 or 工程名など）
    firstColumnHeader: string; // 先頭列ヘッダー表示文言（"担当者" / "工程"）
    /**
     * 先頭列の固定幅。例: 200, "200px", "14rem" など。
     * 指定すると先頭列のヘッダー/ボディ/合計の各セルに width/minWidth/maxWidth を適用し、内容で横幅が変動しないよう固定します。
     */
    firstColumnWidth?: number | string;
    hoursUnit: HoursUnit;
    showDifference: boolean;
    showBaseline: boolean;
    showForecast: boolean;
    // 指定 row, month のセルを取得。該当なしなら undefined
    getCell: (rowKey: string, month: string) => SummaryCell | undefined;
    // 行合計 (row 横断)
    rowTotals: Record<string, SummaryCell>;
    // 月別合計 (行横断)
    monthlyTotals: Record<string, SummaryCell>;
    // 全体合計
    grandTotal: SummaryCell;
    // 行ラベルカスタマイズ（省略時は rowKey をそのまま表示）
    getRowLabel?: (rowKey: string) => React.ReactNode;
    // 行クリック対応（担当者詳細表示など）。指定時のみボタン化
    onRowClick?: (rowKey: string) => void;
    // sticky 第一列を制御（デフォルト true）
    stickyFirstColumn?: boolean;
}

export const MonthlySummaryTable: React.FC<MonthlySummaryTableProps> = ({
    months,
    rows,
    firstColumnHeader,
    firstColumnWidth = 80,
    hoursUnit,
    showDifference,
    showBaseline,
    showForecast,
    getCell,
    rowTotals,
    monthlyTotals,
    grandTotal,
    getRowLabel,
    onRowClick,
    stickyFirstColumn = true,
}) => {
    const formatNumber = (num: number) => {
        const converted = convertHours(num, hoursUnit);
        return converted.toLocaleString("ja-JP", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    };

    const getDifferenceColor = (difference: number) => {
        if (difference > 0) return "text-red-600"; // 実績が予定超過
        if (difference === 0) return "text-green-600"; // 完全一致
        return "text-blue-600"; // 実績が予定未達
    };

    const monthColSpan = (showBaseline ? 1 : 0) + 2 + (showDifference ? 1 : 0) + (showForecast ? 1 : 0);

    // スタイル：先頭列固定幅
    const firstColStyle = (() => {
        if (firstColumnWidth === undefined) return undefined;
        const w = typeof firstColumnWidth === "number" ? `${firstColumnWidth}px` : firstColumnWidth;
        return { width: w, minWidth: w, maxWidth: w } as React.CSSProperties;
    })();

    return (
        <Table>
            <TableHeader>
                <TableRow className="bg-gray-50">
                    <TableHead
                        className={`font-semibold ${stickyFirstColumn ? "sticky left-0 bg-gray-50 z-10" : ""} ${firstColumnHeader === "工程" ? "border-r" : ""}`}
                        style={firstColStyle}
                    >
                        {firstColumnHeader}
                    </TableHead>
                    {months.map((m) => (
                        <TableHead
                            key={m}
                            colSpan={monthColSpan}
                            className="text-center font-semibold min-w-[200px] border-r"
                        >
                            {m}
                        </TableHead>
                    ))}
                    <TableHead className="text-center font-semibold min-w-[200px]" colSpan={3}>
                        合計
                    </TableHead>
                </TableRow>
                <TableRow className="bg-gray-50">
                    <TableHead
                        className={stickyFirstColumn ? "sticky left-0 bg-gray-50 z-10" : ""}
                        style={firstColStyle}
                    ></TableHead>
                    {months.map((m) => (
                        <React.Fragment key={m}>
                            {showBaseline && (
                                <TableHead className="text-center text-xs min-w-[60px]">基準({getUnitSuffix(hoursUnit)})</TableHead>
                            )}
                            <TableHead className="text-center text-xs min-w-[60px]">予定({getUnitSuffix(hoursUnit)})</TableHead>
                            <TableHead
                                className={`text-center text-xs min-w-[60px] ${!showDifference && !showForecast ? "border-r" : ""}`}
                            >
                                実績({getUnitSuffix(hoursUnit)})
                            </TableHead>
                            {showDifference && (
                                <TableHead className={`text-center text-xs min-w-[60px] ${!showForecast ? "border-r" : ""}`}>差分</TableHead>
                            )}
                            {showForecast && (
                                <TableHead className="text-center text-xs min-w-[60px] border-r">見通({getUnitSuffix(hoursUnit)})</TableHead>
                            )}
                        </React.Fragment>
                    ))}
                    <React.Fragment key="grand">
                        <TableHead className="text-center text-xs min-w-[60px]">予定({getUnitSuffix(hoursUnit)})</TableHead>
                        <TableHead className="text-center text-xs min-w-[60px]">実績({getUnitSuffix(hoursUnit)})</TableHead>
                        <TableHead className="text-center text-xs min-w-[60px]">差分</TableHead>
                    </React.Fragment>
                </TableRow>
            </TableHeader>
            <TableBody>
                {rows.map((rowKey) => {
                    const total = rowTotals[rowKey];
                    return (
                        <TableRow key={rowKey}>
                            <TableCell
                                className={`font-medium whitespace-nowrap truncate ${stickyFirstColumn ? "sticky left-0 bg-white z-10" : ""} ${firstColumnHeader === "工程" ? "border-r" : ""}`}
                                style={firstColStyle}
                            >
                                {onRowClick ? (
                                    <button
                                        className="w-full text-center px-2 py-1 hover:bg-gray-100 rounded transition-colors cursor-pointer"
                                        onClick={() => onRowClick(rowKey)}
                                    >
                                        {getRowLabel ? getRowLabel(rowKey) : rowKey}
                                    </button>
                                ) : getRowLabel ? (
                                    getRowLabel(rowKey)
                                ) : (
                                    rowKey
                                )}
                            </TableCell>
                            {months.map((m) => {
                                const cell = getCell(rowKey, m);
                                const planned = cell?.plannedHours || 0;
                                const actual = cell?.actualHours || 0;
                                const diff = cell?.difference || 0;
                                const baseline = cell?.baselineHours || 0;
                                const forecast = cell?.forecastHours || 0;
                                return (
                                    <React.Fragment key={m}>
                                        {showBaseline && (
                                            <TableCell className="text-center text-sm min-w-[60px]">
                                                {baseline > 0 ? formatNumber(baseline) : "-"}
                                            </TableCell>
                                        )}
                                        <TableCell className="text-center text-sm min-w-[60px]">
                                            {planned > 0 ? formatNumber(planned) : "-"}
                                        </TableCell>
                                        <TableCell
                                            className={`text-center text-sm min-w-[60px] ${!showDifference && !showForecast ? "border-r" : ""}`}
                                        >
                                            {actual > 0 ? formatNumber(actual) : "-"}
                                        </TableCell>
                                        {showDifference && (
                                            <TableCell
                                                className={`text-center text-sm min-w-[60px] ${getDifferenceColor(diff)} ${!showForecast ? "border-r" : ""}`}
                                            >
                                                {planned > 0 || actual > 0 ? formatNumber(diff) : "-"}
                                            </TableCell>
                                        )}
                                        {showForecast && (
                                            <TableCell className="text-center text-sm min-w-[60px] border-r">
                                                {forecast > 0 ? formatNumber(forecast) : "-"}
                                            </TableCell>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                            <TableCell className="text-center text-sm font-semibold bg-gray-50">
                                {formatNumber(total?.plannedHours || 0)}
                            </TableCell>
                            <TableCell className="text-center text-sm font-semibold bg-gray-50">
                                {formatNumber(total?.actualHours || 0)}
                            </TableCell>
                            <TableCell
                                className={`text-center text-sm font-semibold bg-gray-50 ${getDifferenceColor(total?.difference || 0)}`}
                            >
                                {formatNumber(total?.difference || 0)}
                            </TableCell>
                        </TableRow>
                    );
                })}
                {/* 月別合計行 */}
                <TableRow className="bg-gray-100 font-semibold">
                    <TableCell className={stickyFirstColumn ? "sticky left-0 bg-gray-100 z-10" : ""} style={firstColStyle}>合計</TableCell>
                    {months.map((m) => {
                        const total = monthlyTotals[m] || ({} as SummaryCell);
                        const baseline = total.baselineHours || 0;
                        const forecast = total.forecastHours || 0;
                        return (
                            <React.Fragment key={m}>
                                {showBaseline && (
                                    <TableCell className={`text-center text-sm ${!showForecast ? "border-r" : ""}`}>
                                        {baseline > 0 ? formatNumber(baseline) : "-"}
                                    </TableCell>
                                )}
                                <TableCell className="text-center text-sm">
                                    {formatNumber(total.plannedHours || 0)}
                                </TableCell>
                                <TableCell
                                    className={`text-center text-sm ${!showDifference && !showBaseline && !showForecast ? "border-r" : ""}`}
                                >
                                    {formatNumber(total.actualHours || 0)}
                                </TableCell>
                                {showDifference && (
                                    <TableCell
                                        className={`text-center text-sm ${getDifferenceColor(total.difference || 0)} ${!showBaseline && !showForecast ? "border-r" : ""}`}
                                    >
                                        {formatNumber(total.difference || 0)}
                                    </TableCell>
                                )}

                                {showForecast && (
                                    <TableCell className="text-center text-sm border-r">
                                        {forecast > 0 ? formatNumber(forecast) : formatNumber((total.actualHours || 0) > 0 ? total.actualHours || 0 : total.plannedHours || 0)}
                                    </TableCell>
                                )}
                            </React.Fragment>
                        );
                    })}
                    {/* 全体合計 */}
                    <TableCell className="text-center text-sm bg-gray-200">
                        {formatNumber(grandTotal.plannedHours)}
                    </TableCell>
                    <TableCell className="text-center text-sm bg-gray-200">
                        {formatNumber(grandTotal.actualHours)}
                    </TableCell>
                    <TableCell
                        className={`text-center text-sm bg-gray-200 ${getDifferenceColor(grandTotal.difference)}`}
                    >
                        {formatNumber(grandTotal.difference)}
                    </TableCell>
                </TableRow>
            </TableBody>
        </Table>
    );
};

export default MonthlySummaryTable;
