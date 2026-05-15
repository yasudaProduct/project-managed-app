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
    difference: number; // actual - planned
    baselineHours?: number; // 任意: 基準工数
    forecastHours?: number; // 任意: 見通し工数
}

// 行アイテム: key（表示/参照用）と並び順 seq。後方互換で string も許可。
export type SummaryRowItem = { key: string; seq: number } | string;

interface MonthlySummaryTableProps {
    months: string[];
    rows: SummaryRowItem[]; // 行キー + 並び順 (string の場合は元の順序 index を seq として扱う)
    firstColumnHeader: string; // 先頭列ヘッダー表示文言
    firstColumnWidth?: number | string; // 先頭列の固定幅
    hoursUnit: HoursUnit; // 工数単位
    showDifference: boolean; // 差分表示
    showBaseline: boolean; // 基準工数表示
    showForecast: boolean; // 見通し工数表示
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
    // 行クリック対応 指定時のみボタン化
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

    const formatSignedDifference = (diff: number) => {
        const converted = convertHours(diff, hoursUnit);
        const abs = Math.abs(converted).toLocaleString("ja-JP", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
        if (converted > 0) return `+${abs}`;
        if (converted < 0) return `-${abs}`;
        return `±${abs}`;
    };

    const getDifferenceColor = (difference: number) => {
        if (difference > 0) return "text-red-600"; // 実績が予定超過
        if (difference === 0) return "text-green-600"; // 完全一致
        return "text-blue-600"; // 実績が予定未達
    };

    const monthColSpan = (showBaseline ? 1 : 0) + 2 /* 予定 + 実績 */ + (showForecast ? 1 : 0);

    // スタイル：先頭列固定幅
    const firstColStyle = (() => {
        if (firstColumnWidth === undefined) return undefined;
        const w = typeof firstColumnWidth === "number" ? `${firstColumnWidth}px` : firstColumnWidth;
        return { width: w, minWidth: w, maxWidth: w } as React.CSSProperties;
    })();

    // rows を正規化して seq 昇順に並べ替え（string の場合は index を seq に採用）
    const normalizedRows = React.useMemo(() => {
        const list = rows.map((r, idx) =>
            typeof r === "string" ? { key: r, seq: idx } : r
        );
        return list.sort((a, b) => a.seq - b.seq);
    }, [rows]);

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
                    <TableHead className="text-center font-semibold min-w-[200px]" colSpan={monthColSpan}>
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
                                className={`text-center text-xs min-w-[60px] ${!showForecast ? "border-r" : ""}`}
                            >
                                {showDifference ? `実績(差分)(${getUnitSuffix(hoursUnit)})` : `実績(${getUnitSuffix(hoursUnit)})`}
                            </TableHead>
                            {showForecast && (
                                <TableHead className="text-center text-xs min-w-[60px] border-r">
                                    {showDifference ? `見通(差分)(${getUnitSuffix(hoursUnit)})` : `見通(${getUnitSuffix(hoursUnit)})`}
                                </TableHead>
                            )}
                        </React.Fragment>
                    ))}
                    <React.Fragment key="grand">
                        {showBaseline && (
                            <TableHead className="text-center text-xs min-w-[60px]">基準({getUnitSuffix(hoursUnit)})</TableHead>
                        )}
                        <TableHead className="text-center text-xs min-w-[60px]">予定({getUnitSuffix(hoursUnit)})</TableHead>
                        <TableHead className="text-center text-xs min-w-[60px]">
                            {showDifference ? `実績(差分)(${getUnitSuffix(hoursUnit)})` : `実績(${getUnitSuffix(hoursUnit)})`}
                        </TableHead>
                        {showForecast && (
                            <TableHead className="text-center text-xs min-w-[60px]">
                                {showDifference ? `見通(差分)(${getUnitSuffix(hoursUnit)})` : `見通(${getUnitSuffix(hoursUnit)})`}
                            </TableHead>
                        )}
                    </React.Fragment>
                </TableRow>
            </TableHeader>
            <TableBody>
                {normalizedRows.map(({ key: rowKey }) => {
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
                                const forecastDiff = forecast - planned;
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
                                            className={`text-center text-sm min-w-[60px] ${!showForecast ? "border-r" : ""}`}
                                        >
                                            {planned > 0 || actual > 0 ? (
                                                <>
                                                    {formatNumber(actual)}
                                                    {showDifference && (
                                                        <span className={`ml-1 ${getDifferenceColor(diff)}`}>
                                                            ({formatSignedDifference(diff)})
                                                        </span>
                                                    )}
                                                </>
                                            ) : (
                                                "-"
                                            )}
                                        </TableCell>
                                        {showForecast && (
                                            <TableCell className="text-center text-sm min-w-[60px] border-r">
                                                {forecast > 0 ? (
                                                    <>
                                                        {formatNumber(forecast)}
                                                        {showDifference && (
                                                            <span className={`ml-1 ${getDifferenceColor(forecastDiff)}`}>
                                                                ({formatSignedDifference(forecastDiff)})
                                                            </span>
                                                        )}
                                                    </>
                                                ) : (
                                                    "-"
                                                )}
                                            </TableCell>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                            {showBaseline && (
                                <TableCell className="text-center text-sm font-semibold bg-gray-50">
                                    {(total?.baselineHours || 0) > 0 ? formatNumber(total?.baselineHours || 0) : "-"}
                                </TableCell>
                            )}
                            <TableCell className="text-center text-sm font-semibold bg-gray-50">
                                {formatNumber(total?.plannedHours || 0)}
                            </TableCell>
                            <TableCell className="text-center text-sm font-semibold bg-gray-50">
                                {formatNumber(total?.actualHours || 0)}
                                {showDifference && (
                                    <span className={`ml-1 font-normal ${getDifferenceColor(total?.difference || 0)}`}>
                                        ({formatSignedDifference(total?.difference || 0)})
                                    </span>
                                )}
                            </TableCell>
                            {showForecast && (
                                <TableCell className="text-center text-sm font-semibold bg-gray-50">
                                    {(total?.forecastHours || 0) > 0 ? (
                                        <>
                                            {formatNumber(total?.forecastHours || 0)}
                                            {showDifference && (
                                                <span className={`ml-1 font-normal ${getDifferenceColor((total?.forecastHours || 0) - (total?.plannedHours || 0))}`}>
                                                    ({formatSignedDifference((total?.forecastHours || 0) - (total?.plannedHours || 0))})
                                                </span>
                                            )}
                                        </>
                                    ) : (
                                        "-"
                                    )}
                                </TableCell>
                            )}
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
                        const planned = total.plannedHours || 0;
                        const actual = total.actualHours || 0;
                        const diff = total.difference || 0;
                        const forecastDiff = forecast - planned;
                        return (
                            <React.Fragment key={m}>
                                {showBaseline && (
                                    <TableCell className="text-center text-sm">
                                        {baseline > 0 ? formatNumber(baseline) : "-"}
                                    </TableCell>
                                )}
                                <TableCell className="text-center text-sm">
                                    {formatNumber(planned)}
                                </TableCell>
                                <TableCell
                                    className={`text-center text-sm ${!showForecast ? "border-r" : ""}`}
                                >
                                    {formatNumber(actual)}
                                    {showDifference && (
                                        <span className={`ml-1 font-normal ${getDifferenceColor(diff)}`}>
                                            ({formatSignedDifference(diff)})
                                        </span>
                                    )}
                                </TableCell>
                                {showForecast && (
                                    <TableCell className="text-center text-sm border-r">
                                        {formatNumber(forecast)}
                                        {showDifference && (
                                            <span className={`ml-1 font-normal ${getDifferenceColor(forecastDiff)}`}>
                                                ({formatSignedDifference(forecastDiff)})
                                            </span>
                                        )}
                                    </TableCell>
                                )}
                            </React.Fragment>
                        );
                    })}
                    {/* 全体合計 */}
                    {showBaseline && (
                        <TableCell className="text-center text-sm bg-gray-200">
                            {(grandTotal.baselineHours || 0) > 0 ? formatNumber(grandTotal.baselineHours || 0) : "-"}
                        </TableCell>
                    )}
                    <TableCell className="text-center text-sm bg-gray-200">
                        {formatNumber(grandTotal.plannedHours)}
                    </TableCell>
                    <TableCell className="text-center text-sm bg-gray-200">
                        {formatNumber(grandTotal.actualHours)}
                        {showDifference && (
                            <span className={`ml-1 font-normal ${getDifferenceColor(grandTotal.difference)}`}>
                                ({formatSignedDifference(grandTotal.difference)})
                            </span>
                        )}
                    </TableCell>
                    {showForecast && (
                        <TableCell className="text-center text-sm bg-gray-200">
                            {(grandTotal.forecastHours || 0) > 0 ? (
                                <>
                                    {formatNumber(grandTotal.forecastHours || 0)}
                                    {showDifference && (
                                        <span className={`ml-1 font-normal ${getDifferenceColor((grandTotal.forecastHours || 0) - grandTotal.plannedHours)}`}>
                                            ({formatSignedDifference((grandTotal.forecastHours || 0) - grandTotal.plannedHours)})
                                        </span>
                                    )}
                                </>
                            ) : (
                                "-"
                            )}
                        </TableCell>
                    )}
                </TableRow>
            </TableBody>
        </Table>
    );
};

export default MonthlySummaryTable;
