export type FreeTimeSlotDto = {
    startTime: string; // "HH:mm"
    endTime: string; // "HH:mm"
    durationMinutes: number;
};

export type FreeTimeDailySlotsDto = {
    date: string; // "YYYY-MM-DD"（UTC暦日）
    slots: FreeTimeSlotDto[];
};

/** 検索に実際に適用された条件（デフォルト解決後） */
export type FreeTimeSearchConditionsDto = {
    users: { id: string; name: string }[];
    startDate: string; // "YYYY-MM-DD"
    endDate: string; // "YYYY-MM-DD"
    minDurationMinutes: number; // 0 = 指定なし
    windowStartTime: string; // "09:00"
    windowEndTime: string; // "18:00"
};

export type FreeTimeSearchResultDto = {
    conditions: FreeTimeSearchConditionsDto;
    days: FreeTimeDailySlotsDto[];
};
