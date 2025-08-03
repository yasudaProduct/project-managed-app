"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface MonthPickerProps {
  value?: string; // YYYY-MM format
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function MonthPicker({
  value,
  onChange,
  placeholder = "月を選択",
  disabled = false,
}: MonthPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentYear, setCurrentYear] = useState(() => {
    if (value) {
      return parseInt(value.split("-")[0]);
    }
    return new Date().getFullYear();
  });

  const currentDate = new Date();
  const selectedDate = value ? new Date(`${value}-01`) : null;

  const months = [
    "1月",
    "2月",
    "3月",
    "4月",
    "5月",
    "6月",
    "7月",
    "8月",
    "9月",
    "10月",
    "11月",
    "12月",
  ];

  const handleMonthSelect = (monthIndex: number) => {
    const monthStr = (monthIndex + 1).toString().padStart(2, "0");
    const newValue = `${currentYear}-${monthStr}`;
    onChange(newValue);
    setIsOpen(false);
  };

  const navigateYear = (direction: "prev" | "next") => {
    setCurrentYear((prev) => (direction === "prev" ? prev - 1 : prev + 1));
  };

  const formatDisplayValue = (value: string) => {
    const [year, month] = value.split("-");
    return `${year}年${parseInt(month)}月`;
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full pl-3 text-left font-normal",
            !value && "text-muted-foreground"
          )}
          disabled={disabled}
        >
          {value ? formatDisplayValue(value) : placeholder}
          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 z-50" align="start">
        <div className="p-3">
          {/* Year navigation */}
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => navigateYear("prev")}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="font-semibold">{currentYear}年</div>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => navigateYear("next")}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Month grid */}
          <div className="grid grid-cols-3 gap-2">
            {months.map((month, index) => {
              const isSelected =
                selectedDate &&
                selectedDate.getFullYear() === currentYear &&
                selectedDate.getMonth() === index;

              const isCurrent =
                currentDate.getFullYear() === currentYear &&
                currentDate.getMonth() === index;

              return (
                <Button
                  key={index}
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "h-9 w-16 text-sm",
                    isCurrent && !isSelected && "border-primary",
                    isSelected && "bg-primary text-primary-foreground"
                  )}
                  onClick={() => handleMonthSelect(index)}
                >
                  {month}
                </Button>
              );
            })}
          </div>

          {/* Quick navigation to current month */}
          <div className="mt-4 pt-3 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={() => {
                const now = new Date();
                setCurrentYear(now.getFullYear());
                handleMonthSelect(now.getMonth());
              }}
            >
              今月を選択
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
