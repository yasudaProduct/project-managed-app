'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, Clock } from 'lucide-react';

interface OverallMetrics {
  totalProjects: number;
  healthyProjects: number;
  warningProjects: number;
  criticalProjects: number;
  totalBudget: number;
  totalEarnedValue: number;
  totalActualCost: number;
  overallCpi: number;
  overallSpi: number;
}

interface EvmSummaryCardsProps {
  overallMetrics: OverallMetrics;
}

export function EvmSummaryCards({ overallMetrics }: EvmSummaryCardsProps) {
  const formatNumber = (num: number) => {
    return num.toLocaleString('ja-JP', { maximumFractionDigits: 1 });
  };

  const getPerformanceColor = (index: number) => {
    if (index >= 1) return 'text-green-600';
    if (index >= 0.9) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPerformanceIcon = (index: number) => {
    return index >= 1 ? (
      <TrendingUp className="h-4 w-4" />
    ) : (
      <TrendingDown className="h-4 w-4" />
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* プロジェクト健全性 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">プロジェクト健全性</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-green-600">良好</span>
              <span className="font-semibold">{overallMetrics.healthyProjects}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-yellow-600">注意</span>
              <span className="font-semibold">{overallMetrics.warningProjects}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-red-600">危険</span>
              <span className="font-semibold">{overallMetrics.criticalProjects}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 総予算vs実績 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">予算 vs 実績</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <div className="text-2xl font-bold">
              {formatNumber(overallMetrics.totalActualCost)}h
            </div>
            <div className="text-xs text-muted-foreground">
              予算: {formatNumber(overallMetrics.totalBudget)}h
            </div>
            <div className={`text-sm font-medium ${
              overallMetrics.totalActualCost <= overallMetrics.totalBudget 
                ? 'text-green-600' 
                : 'text-red-600'
            }`}>
              {overallMetrics.totalActualCost <= overallMetrics.totalBudget ? '予算内' : '予算超過'}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CPI (コスト効率) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">コスト効率 (CPI)</CardTitle>
          <div className={getPerformanceColor(overallMetrics.overallCpi)}>
            {getPerformanceIcon(overallMetrics.overallCpi)}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <div className={`text-2xl font-bold ${getPerformanceColor(overallMetrics.overallCpi)}`}>
              {overallMetrics.overallCpi.toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground">
              EV: {formatNumber(overallMetrics.totalEarnedValue)}h
            </div>
            <div className="text-xs text-muted-foreground">
              AC: {formatNumber(overallMetrics.totalActualCost)}h
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SPI (スケジュール効率) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">スケジュール効率 (SPI)</CardTitle>
          <div className={getPerformanceColor(overallMetrics.overallSpi)}>
            <Clock className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <div className={`text-2xl font-bold ${getPerformanceColor(overallMetrics.overallSpi)}`}>
              {overallMetrics.overallSpi.toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground">
              EV: {formatNumber(overallMetrics.totalEarnedValue)}h
            </div>
            <div className="text-xs text-muted-foreground">
              進捗: {((overallMetrics.totalEarnedValue / overallMetrics.totalBudget) * 100).toFixed(1)}%
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}