type ScheduleSlipBadgeProps = {
  /** スリップ日数（予定終了日 − 基準終了日）。基準未設定は null */
  days: number | null;
};

/** 基準日程からのずれ。遅れは赤、前倒しは緑で示す */
export function ScheduleSlipBadge({ days }: ScheduleSlipBadgeProps) {
  if (days === null) return <span className="text-muted-foreground">—</span>;
  if (days > 0) return <span className="font-medium text-red-600">+{days}日</span>;
  if (days < 0) return <span className="text-green-700">{days}日</span>;
  return <span className="text-muted-foreground">±0</span>;
}
