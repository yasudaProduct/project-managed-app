import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/utils/date-util";
import { formatEvmValue } from "@/utils/evm-format";
import type { EvmBufferConsumption } from "@/applications/evm/evm-service";

type EvmBufferCardProps = {
  bufferConsumption: EvmBufferConsumption;
  calculationMode: "hours" | "cost";
  /** 前回の確認日（ISO）。前回値の表示に使う */
  previousDate?: string | null;
};

const ZONE_BADGES: Record<
  EvmBufferConsumption["current"]["zone"],
  { label: string; className: string }
> = {
  healthy: { label: "健全", className: "bg-green-500 hover:bg-green-500" },
  warning: { label: "注意", className: "bg-yellow-500 hover:bg-yellow-500" },
  critical: { label: "危険", className: "bg-red-600 hover:bg-red-600" },
};

const formatPct = (value: number) => `${value.toFixed(1)}%`;

/**
 * バッファ消化（フィーバーチャートの考え方）。
 * バッファの減り方（消化率）が作業の進み方（出来高率）より速くないかを示す。
 */
export function EvmBufferCard({
  bufferConsumption,
  calculationMode,
  previousDate = null,
}: EvmBufferCardProps) {
  const { current, previous } = bufferConsumption;
  const badge = ZONE_BADGES[current.zone];
  const formatValue = (value: number) => formatEvmValue(value, calculationMode);
  const bars = [
    { label: "消化率", value: current.consumptionPct, color: "bg-red-400" },
    { label: "出来高率", value: current.progressPct, color: "bg-blue-500" },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">バッファ消化</CardTitle>
        <Badge className={badge.className}>{badge.label}</Badge>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {bars.map((bar) => (
          <div key={bar.label} className="space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{bar.label}</span>
              <span className="font-medium">{formatPct(bar.value)}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-200">
              <div
                className={`h-2 rounded-full ${bar.color}`}
                style={{ width: `${Math.min(bar.value, 100)}%` }}
              />
            </div>
          </div>
        ))}
        <p className="text-gray-700">
          残り {formatValue(current.remainingAmount)} / {formatValue(current.bufferAmount)}
        </p>
        {previous && previousDate && (
          <p className="text-xs text-gray-600">
            前回（{formatDate(new Date(previousDate), "M/D(曜)")}）: 消化率{" "}
            {formatPct(previous.consumptionPct)} / 出来高率 {formatPct(previous.progressPct)}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          消化はこれまでの超過（AC − EV）です。消化率が出来高率を上回るとバッファの減りが作業の進みより速く、20pt を超えて上回るかバッファを使い切ると「危険」です。
        </p>
      </CardContent>
    </Card>
  );
}
