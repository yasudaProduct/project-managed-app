'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { EvmMetricsData } from '@/app/actions/evm/evm-actions';
import {
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';

type EvmMetricsCardProps = {
  metrics: EvmMetricsData;
};

export function EvmMetricsCard({ metrics }: EvmMetricsCardProps) {
  const getHealthBadge = () => {
    switch (metrics.healthStatus) {
      case 'healthy':
        return (
          <Badge className="bg-green-500 hover:bg-green-600">
            <CheckCircle className="h-3 w-3 mr-1" />
            健全
          </Badge>
        );
      case 'warning':
        return (
          <Badge className="bg-yellow-500 hover:bg-yellow-600">
            <AlertTriangle className="h-3 w-3 mr-1" />
            注意
          </Badge>
        );
      case 'critical':
        return (
          <Badge variant="destructive">
            <AlertCircle className="h-3 w-3 mr-1" />
            危機的
          </Badge>
        );
    }
  };

  const getVarianceIcon = (value: number) => {
    if (value > 0) {
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    } else if (value < 0) {
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    }
    return null;
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  return (
    <div className="space-y-4">
      {/* ヘルスステータス */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>プロジェクトヘルスステータス</CardTitle>
            {getHealthBadge()}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">完了率</p>
              <p className="text-2xl font-bold">
                {metrics.completionRate.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">スケジュール効率 (SPI)</p>
              <p className="text-2xl font-bold">{metrics.spi.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">コスト効率 (CPI)</p>
              <p className="text-2xl font-bold">{metrics.cpi.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">評価日</p>
              <p className="text-sm font-medium">
                {new Date(metrics.date).toLocaleDateString('ja-JP')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 基本指標 */}
      <Card>
        <CardHeader>
          <CardTitle>基本指標</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">計画価値 (PV)</p>
              <p className="text-xl font-semibold">{metrics.formattedPv}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">出来高 (EV)</p>
              <p className="text-xl font-semibold">{metrics.formattedEv}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">実コスト (AC)</p>
              <p className="text-xl font-semibold">{metrics.formattedAc}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">完了時予算 (BAC)</p>
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
                <p className="text-sm text-muted-foreground">
                  スケジュール差異 (SV)
                </p>
                {getVarianceIcon(metrics.sv)}
              </div>
              <p className="text-xl font-semibold">
                {metrics.calculationMode === 'hours'
                  ? `${metrics.sv.toFixed(1)}h`
                  : `¥${metrics.sv.toLocaleString()}`}
              </p>
              <p className="text-xs text-muted-foreground">
                {metrics.sv > 0 ? '進捗が計画より進んでいます' : '進捗が計画より遅れています'}
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">コスト差異 (CV)</p>
                {getVarianceIcon(metrics.cv)}
              </div>
              <p className="text-xl font-semibold">
                {metrics.calculationMode === 'hours'
                  ? `${metrics.cv.toFixed(1)}h`
                  : `¥${metrics.cv.toLocaleString()}`}
              </p>
              <p className="text-xs text-muted-foreground">
                {metrics.cv > 0 ? 'コストが予算内です' : 'コストが予算を超過しています'}
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
              <p className="text-sm text-muted-foreground">完了時総コスト (EAC)</p>
              <p className="text-xl font-semibold">
                {metrics.calculationMode === 'hours'
                  ? `${metrics.eac.toFixed(1)}h`
                  : `¥${metrics.eac.toLocaleString()}`}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">残コスト (ETC)</p>
              <p className="text-xl font-semibold">
                {metrics.calculationMode === 'hours'
                  ? `${metrics.etc.toFixed(1)}h`
                  : `¥${metrics.etc.toLocaleString()}`}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">完了時差異 (VAC)</p>
              <div className="flex items-center gap-2">
                <p className="text-xl font-semibold">
                  {metrics.calculationMode === 'hours'
                    ? `${metrics.vac.toFixed(1)}h`
                    : `¥${metrics.vac.toLocaleString()}`}
                </p>
                {getVarianceIcon(metrics.vac)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* パフォーマンス指標 */}
      <Card>
        <CardHeader>
          <CardTitle>パフォーマンス指標</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                スケジュール効率指数 (SPI)
              </p>
              <p className="text-2xl font-bold">{metrics.spi.toFixed(3)}</p>
              <p className="text-xs text-muted-foreground">
                {formatPercentage(metrics.spi)} の進捗効率
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    metrics.spi >= 1
                      ? 'bg-green-500'
                      : metrics.spi >= 0.9
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(metrics.spi * 100, 100)}%` }}
                />
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                コスト効率指数 (CPI)
              </p>
              <p className="text-2xl font-bold">{metrics.cpi.toFixed(3)}</p>
              <p className="text-xs text-muted-foreground">
                {formatPercentage(metrics.cpi)} のコスト効率
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    metrics.cpi >= 1
                      ? 'bg-green-500'
                      : metrics.cpi >= 0.9
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(metrics.cpi * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
