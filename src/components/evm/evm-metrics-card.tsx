"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { EvmMetricsData } from "@/app/actions/evm/evm-actions";
import {
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  Info,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";

type EvmMetricsCardProps = {
  metrics: EvmMetricsData;
};

export function EvmMetricsCard({ metrics }: EvmMetricsCardProps) {
  const getHealthBadge = () => {
    switch (metrics.healthStatus) {
      case "healthy":
        return (
          <Badge className="bg-green-500 hover:bg-green-600">
            <CheckCircle className="h-3 w-3 mr-1" />
            健全
          </Badge>
        );
      case "warning":
        return (
          <Badge className="bg-yellow-500 hover:bg-yellow-600">
            <AlertTriangle className="h-3 w-3 mr-1" />
            注意
          </Badge>
        );
      case "critical":
        return (
          <Badge variant="destructive">
            <AlertCircle className="h-3 w-3 mr-1" />
            危機的
          </Badge>
        );
    }
  };

  /**
   * 差異アイコンを取得
   * @param value 差異
   * @returns 差異アイコン（正の場合は上向きの矢印、負の場合は下向きの矢印、0の場合はnull）
   */
  const getVarianceIcon = (value: number): React.ReactNode | null => {
    if (value > 0) {
      return <TrendingUp className="h-6 w-6 text-green-500" />;
    } else if (value < 0) {
      return <TrendingDown className="h-6 w-6 text-red-500" />;
    }
    return null;
  };

  /**
   * パーセンテージをフォーマット
   * @param value パーセンテージ
   * @returns パーセンテージをフォーマットした文字列
   */
  const formatPercentage = (value: number): string => {
    return `${(value * 100).toFixed(1)}%`;
  };

  return (
    <div className="space-y-4">
      {/* ヘルスステータス */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="">
              <div className="flex items-center">
                ヘルスステータス
                <span className="ml-2">{getHealthBadge()}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                評価日: {new Date(metrics.date).toLocaleDateString("ja-JP")}
              </p>
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="flex items-center text-sm text-muted-foreground">
                完了率
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>{<Info className="w-4 ml-2" />}</TooltipTrigger>
                    <TooltipContent className="max-w-sm">
                      完了率 = (EV / BAC) × 100%
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </p>
              <p className="text-2xl font-bold">
                {metrics.completionRate.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="flex items-center text-sm text-muted-foreground">
                スケジュール効率指数 (SPI)
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>{<Info className="w-4 ml-2" />}</TooltipTrigger>
                    <TooltipContent className="max-w-sm">
                      SPI= EV / PV<br />
                      計画に対する進捗の効率性を示す指標です。<br />
                      1以上であれば計画より進んでいることを示し、1未満であれば遅れていることを示します。
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </p>
              <p className="text-2xl font-bold">{metrics.spi.toFixed(3)}</p>
              <p className="text-xs text-muted-foreground">
                {formatPercentage(metrics.spi)} の進捗効率
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${metrics.spi >= 1
                    ? "bg-green-500"
                    : metrics.spi >= 0.9
                      ? "bg-yellow-500"
                      : "bg-red-500"
                    }`}
                  style={{ width: `${Math.min(metrics.spi * 100, 100)}%` }}
                />
              </div>
            </div>
            <div>
              <p className="flex items-center text-sm text-muted-foreground">
                コスト効率指数 (CPI)
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>{<Info className="w-4 ml-2" />}</TooltipTrigger>
                    <TooltipContent className="max-w-sm">
                      CPI = EV / AC<br />
                      投入したコストに対する出来高の効率性を示す指標です。<br />
                      1以上であればコストが予算内であることを示し、1未満であればコスト超過を示します。
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </p>
              <p className="text-2xl font-bold">{metrics.cpi.toFixed(3)}</p>
              <p className="text-xs text-muted-foreground">
                {formatPercentage(metrics.cpi)} のコスト効率
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${metrics.cpi >= 1
                    ? "bg-green-500"
                    : metrics.cpi >= 0.9
                      ? "bg-yellow-500"
                      : "bg-red-500"
                    }`}
                  style={{ width: `${Math.min(metrics.cpi * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>
          {/* 基本指標 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="space-y-1">
              <p className="flex items-center text-sm text-muted-foreground">
                計画価値 (PV)
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>{<Info className="w-4 ml-2" />}</TooltipTrigger>
                    <TooltipContent className="max-w-sm">
                      評価日までの計画値の合計。<br />
                      プロジェクトがどれだけ進むべきかを示す指標です。
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </p>
              <p className="text-xl font-semibold">{metrics.formattedPv}</p>
            </div>
            <div className="space-y-1">
              <p className="flex items-center text-sm text-muted-foreground">
                出来高 (EV)
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>{<Info className="w-4 ml-2" />}</TooltipTrigger>
                    <TooltipContent className="max-w-sm">
                      評価日までに実際に完了した作業の価値の合計。<br />
                      プロジェクトの進捗状況を示す指標です。
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </p>
              <p className="text-xl font-semibold">{metrics.formattedEv}</p>
            </div>
            <div className="space-y-1">
              <p className="flex items-center text-sm text-muted-foreground">
                実コスト (AC)
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>{<Info className="w-4 ml-2" />}</TooltipTrigger>
                    <TooltipContent className="max-w-sm">
                      評価日までに実際に投入したコストの合計。<br />
                      プロジェクトのコスト状況を示す指標です。
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </p>
              <p className="text-xl font-semibold">{metrics.formattedAc}</p>
            </div>
            <div className="space-y-1">
              <p className="flex items-center text-sm text-muted-foreground">
                完了時予算 (BAC)
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>{<Info className="w-4 ml-2" />}</TooltipTrigger>
                    <TooltipContent className="max-w-sm">
                      プロジェクト完了時の予算総額。<br />
                      プロジェクトの予算目標を示す指標です。
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </p>
              <p className="text-xl font-semibold">{metrics.formattedBac}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 差異分析 */}
      <Card>
        <CardHeader>
          <CardTitle>差異分析</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="flex items-center text-sm text-muted-foreground">
                  スケジュール差異 (SV)
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        {<Info className="w-4 ml-2" />}
                      </TooltipTrigger>
                      <TooltipContent className="max-w-sm">
                        SV = EV - PV<br />
                        進捗が計画に対してどれだけ前後しているかを示す指標です。<br />
                        正の値は進捗が計画より進んでいることを示し、負の値は遅れていることを示します。
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </p>
              </div>
              <div className="flex items-center gap-2">
                {getVarianceIcon(metrics.sv)}
                <p className="text-xl font-semibold">

                  {metrics.calculationMode === "hours"
                    ? `${metrics.sv.toFixed(1)}h`
                    : `¥${metrics.sv.toLocaleString()}`}
                </p>
              </div>
              <p className="text-xs text-muted-foreground ">
                {metrics.sv > 0
                  ? "進捗が計画より進んでいます"
                  : "進捗が計画より遅れています"}
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="flex items-center text-sm text-muted-foreground">コスト差異 (CV)
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        {<Info className="w-4 ml-2" />}
                      </TooltipTrigger>
                      <TooltipContent className="max-w-sm">
                        CV = EV - AC<br />
                        コストが予算に対してどれだけ前後しているかを示す指標です。<br />
                        正の値はコストが予算内であることを示し、負の値はコスト超過を示します。
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </p>
              </div>
              <div className="flex items-center gap-2">
                {getVarianceIcon(metrics.cv)}
                <p className="text-xl font-semibold">
                  {metrics.calculationMode === "hours"
                    ? `${metrics.cv.toFixed(1)}h`
                    : `¥${metrics.cv.toLocaleString()}`}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                {metrics.cv > 0
                  ? "コストが予算内です"
                  : "コストが予算を超過しています"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 予測指標 */}
      <Card>
        <CardHeader>
          <CardTitle>完了時予測</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <p className="flex items-center text-sm text-muted-foreground">
                完了時総コスト (EAC)
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>{<Info className="w-4 ml-2" />}</TooltipTrigger>
                    <TooltipContent className="max-w-sm">
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </p>
              <p className="text-xl font-semibold">
                {metrics.calculationMode === "hours"
                  ? `${metrics.eac.toFixed(1)}h`
                  : `¥${metrics.eac.toLocaleString()}`}
              </p>
            </div>
            <div className="space-y-1">
              <p className="flex items-center text-sm text-muted-foreground">
                残コスト (ETC)
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>{<Info className="w-4 ml-2" />}</TooltipTrigger>
                    <TooltipContent className="max-w-sm">
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </p>
              <p className="text-xl font-semibold">
                {metrics.calculationMode === "hours"
                  ? `${metrics.etc.toFixed(1)}h`
                  : `¥${metrics.etc.toLocaleString()}`}
              </p>
            </div>
            <div className="space-y-1">
              <p className="flex items-center text-sm text-muted-foreground">
                完了時差異 (VAC)
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>{<Info className="w-4 ml-2" />}</TooltipTrigger>
                    <TooltipContent className="max-w-sm">
                      VAC = BAC - EAC<br />
                      プロジェクト完了時の予測差異を示す指標です。<br />
                      予算に対して完了時にどれだけの差異があるかを予測します。<br />
                      正の値は当初に計画した予算内でプロジェクトが完了する可能性が高く、負の値は予算オーバーになる可能性が高くなります。
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </p>
              <div className="flex items-center gap-2">
                <p className="text-xl font-semibold">
                  {metrics.calculationMode === "hours"
                    ? `${metrics.vac.toFixed(1)}h`
                    : `¥${metrics.vac.toLocaleString()}`}
                </p>
                {getVarianceIcon(metrics.vac)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div >
  );
}
