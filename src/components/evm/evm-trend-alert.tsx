import { TrendingDown } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PROGRESS_REVIEW_CYCLE_LABELS } from "@/types/progress-review-cycle";
import type { EvmTrendDto } from "@/applications/trend/evm-trend-application-service";

type EvmTrendAlertProps = {
  trend: EvmTrendDto;
};

const formatValues = (values: Array<number | null>) =>
  values.map((value) => (value !== null ? value.toFixed(3) : "—")).join(" → ");

/**
 * 悪化トレンドの警告。進捗確認サイクルの単位で SPI / CPI が連続して下がっているときだけ表示する。
 * 「悪い」より「悪化し続けている」方が手を打つ判断に直結するため、現在値のカードとは別に知らせる。
 */
export function EvmTrendAlert({ trend }: EvmTrendAlertProps) {
  const cycleLabel = PROGRESS_REVIEW_CYCLE_LABELS[trend.progressReviewCycle];
  const deteriorations = [
    {
      label: "SPI",
      isDeteriorating: trend.isSpiDeteriorating,
      values: trend.points.map((point) => point.spi),
    },
    {
      label: "CPI",
      isDeteriorating: trend.isCpiDeteriorating,
      values: trend.points.map((point) => point.cpi),
    },
  ].filter((item) => item.isDeteriorating);

  if (deteriorations.length === 0) return null;

  return (
    <Alert variant="destructive">
      <TrendingDown className="h-4 w-4" />
      <AlertDescription className="space-y-1">
        {deteriorations.map((item) => (
          <p key={item.label}>
            {item.label}が{cycleLabel}で{trend.periods}期連続して悪化しています（
            {formatValues(item.values)}）
          </p>
        ))}
      </AlertDescription>
    </Alert>
  );
}
