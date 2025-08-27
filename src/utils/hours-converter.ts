export type HoursUnit = 'hours' | 'days' | 'months';

export const HOURS_UNIT_LABELS: Record<HoursUnit, string> = {
  hours: '時間',
  days: '人日',
  months: '人月'
};

const HOURS_PER_DAY = 7.5;
const DAYS_PER_MONTH = 20;
const HOURS_PER_MONTH = HOURS_PER_DAY * DAYS_PER_MONTH;

export function convertHours(hours: number, unit: HoursUnit): number {
  switch (unit) {
    case 'hours':
      return hours;
    case 'days':
      return hours / HOURS_PER_DAY;
    case 'months':
      return hours / HOURS_PER_MONTH;
    default:
      return hours;
  }
}

export function formatHoursWithUnit(hours: number, unit: HoursUnit): string {
  const converted = convertHours(hours, unit);
  const formatted = converted.toLocaleString("ja-JP", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  
  switch (unit) {
    case 'hours':
      return `${formatted}h`;
    case 'days':
      return `${formatted}人日`;
    case 'months':
      return `${formatted}人月`;
    default:
      return formatted;
  }
}

export function getUnitSuffix(unit: HoursUnit): string {
  switch (unit) {
    case 'hours':
      return 'h';
    case 'days':
      return '人日';
    case 'months':
      return '人月';
    default:
      return '';
  }
}