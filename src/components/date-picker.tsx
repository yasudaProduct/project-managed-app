import { ControllerRenderProps } from "react-hook-form";
import { FormControl } from "./ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "./ui/calendar";
import { formatDateToLocalString } from "@/components/ganttv2/gantt-utils";
import { Input } from "./ui/input";
import { useState, useRef, useEffect } from "react";
import { Button } from "./ui/button";

type DatePickerProp = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  field: ControllerRenderProps<any, string>;
};

export function DatePicker({ field }: DatePickerProp) {
  const [inputValue, setInputValue] = useState(field.value || "");
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInputValue(field.value || "");
  }, [field.value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    
    // 自動フォーマット: YYYYMMDD -> YYYY/MM/DD
    if (/^\d{8}$/.test(value)) {
      const formatted = `${value.slice(0, 4)}/${value.slice(4, 6)}/${value.slice(6, 8)}`;
      setInputValue(formatted);
      field.onChange(formatted);
    } else if (/^\d{4}\/\d{2}\/\d{2}$/.test(value)) {
      field.onChange(value);
    }
  };

  const handleInputBlur = () => {
    // 入力値の検証
    if (/^\d{4}\/\d{2}\/\d{2}$/.test(inputValue)) {
      field.onChange(inputValue);
    } else if (inputValue === "") {
      field.onChange("");
    } else {
      // 無効な入力の場合は元の値に戻す
      setInputValue(field.value || "");
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleInputBlur();
    }
    if (e.key === "Escape") {
      setInputValue(field.value || "");
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData("text");
    
    // ペーストされたテキストの処理
    const cleaned = pastedText.trim();
    
    // YYYY-MM-DD形式をYYYY/MM/DD形式に変換
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
      const formatted = cleaned.replace(/-/g, "/");
      setInputValue(formatted);
      field.onChange(formatted);
    } 
    // YYYYMMDD形式をYYYY/MM/DD形式に変換
    else if (/^\d{8}$/.test(cleaned)) {
      const formatted = `${cleaned.slice(0, 4)}/${cleaned.slice(4, 6)}/${cleaned.slice(6, 8)}`;
      setInputValue(formatted);
      field.onChange(formatted);
    }
    // すでにYYYY/MM/DD形式の場合
    else if (/^\d{4}\/\d{2}\/\d{2}$/.test(cleaned)) {
      setInputValue(cleaned);
      field.onChange(cleaned);
    }
    // その他の形式はそのまま設定
    else {
      setInputValue(cleaned);
    }
  };

  return (
    <FormControl>
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onKeyDown={handleInputKeyDown}
          onPaste={handlePaste}
          placeholder="YYYY/MM/DD"
          className="pr-10"
        />
        <Popover modal={true} open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
              onClick={() => setIsOpen(true)}
            >
              <CalendarIcon className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 z-50" align="end">
            <div className="p-3 border-b bg-muted/30">
              <p className="text-xs text-muted-foreground">
                カレンダーから日付を選択するか、入力欄に直接入力してください
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                対応形式: YYYY/MM/DD, YYYYMMDD, YYYY-MM-DD
              </p>
            </div>
            <Calendar
              mode="single"
              selected={field.value ? new Date(field.value.replace(/\//g, "-")) : undefined}
              onSelect={(date) => {
                field.onChange(date ? formatDateToLocalString(date) : "");
                setIsOpen(false);
              }}
              initialFocus
              className="rounded-b-md"
            />
          </PopoverContent>
        </Popover>
      </div>
    </FormControl>
  );
}
