"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Settings } from "lucide-react";

/** 表示設定で切り替えられる列 */
export type SummaryDisplaySettingColumn =
  | "difference"
  | "baseline"
  | "planned"
  | "forecast";

const COLUMN_LABELS: Record<SummaryDisplaySettingColumn, string> = {
  difference: "差分を表示",
  baseline: "基準を表示",
  planned: "予定を表示",
  forecast: "見通しを表示",
};

interface SummaryDisplaySettingsProps {
  /** チェックボックスのid重複を避けるための接頭辞 */
  idPrefix: string;
  /** 表示する切替項目（表示順） */
  columns: SummaryDisplaySettingColumn[];
  /** 各列の現在の表示状態 */
  values: Record<SummaryDisplaySettingColumn, boolean>;
  /** 表示状態の変更 */
  onChange: (column: SummaryDisplaySettingColumn, next: boolean) => void;
  /** 切り替え不可の判定 */
  isDisabled?: (column: SummaryDisplaySettingColumn) => boolean;
  /** ラベルの接頭辞（例: 「月毎の」） */
  labelPrefix?: string;
}

/**
 * 集計表の表示設定ドロップダウン
 */
export function SummaryDisplaySettings({
  idPrefix,
  columns,
  values,
  onChange,
  isDisabled,
  labelPrefix = "",
}: SummaryDisplaySettingsProps) {
  const [isOpen, setIsOpen] = useState(false);

  const hasDisabledColumn = columns.some((column) => isDisabled?.(column));

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings className="h-4 w-4" />
          表示設定
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="p-2 space-y-2">
          {columns.map((column) => {
            const id = `${idPrefix}-show-${column}`;
            const disabled = isDisabled?.(column) ?? false;
            return (
              <div key={column} className="flex items-center space-x-2">
                <Checkbox
                  id={id}
                  checked={values[column]}
                  disabled={disabled}
                  onCheckedChange={(checked) => onChange(column, !!checked)}
                />
                <label
                  htmlFor={id}
                  className={`text-sm font-medium leading-none ${
                    disabled
                      ? "cursor-not-allowed opacity-50"
                      : "cursor-pointer"
                  }`}
                >
                  {labelPrefix}
                  {COLUMN_LABELS[column]}
                </label>
              </div>
            );
          })}
          {hasDisabledColumn && (
            <p className="text-xs text-gray-500 pt-1">
              基準・予定・実績・見通しをすべて同時に表示することはできません
            </p>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default SummaryDisplaySettings;
