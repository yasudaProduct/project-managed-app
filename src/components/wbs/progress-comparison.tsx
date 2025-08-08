'use client';

/**
 * WBS進捗比較コンポーネント
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowRight, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Calendar,
  BarChart3,
  Users,
  Clock
} from 'lucide-react';
import { useProgressHistories } from '@/hooks/use-progress-history';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

interface ProgressComparisonProps {
  wbsId: number;
}

interface ComparisonResult {
  metric: string;
  label: string;
  before: number;
  after: number;
  change: number;
  changePercent: number;
  unit: string;
  icon: React.ReactNode;
}

export function ProgressComparison({ wbsId }: ProgressComparisonProps) {
  const [beforeHistoryId, setBeforeHistoryId] = useState<string>('');
  const [afterHistoryId, setAfterHistoryId] = useState<string>('');

  // 履歴データ取得（比較用に多めに取得）
  const { data: historiesData, isLoading } = useProgressHistories(wbsId, {
    limit: 100,
  });

  const histories = historiesData?.histories || [];

  // 選択された履歴を取得
  const beforeHistory = histories.find(h => h.id.toString() === beforeHistoryId);
  const afterHistory = histories.find(h => h.id.toString() === afterHistoryId);

  // 比較結果を計算
  const calculateComparison = (): ComparisonResult[] => {
    if (!beforeHistory || !afterHistory) return [];

    const results: ComparisonResult[] = [
      {
        metric: 'completionRate',
        label: '完了率',
        before: beforeHistory.completionRate,
        after: afterHistory.completionRate,
        change: afterHistory.completionRate - beforeHistory.completionRate,
        changePercent: beforeHistory.completionRate > 0 
          ? ((afterHistory.completionRate - beforeHistory.completionRate) / beforeHistory.completionRate) * 100
          : 0,
        unit: '%',
        icon: <BarChart3 className="w-4 h-4" />,
      },
      {
        metric: 'completedCount',
        label: '完了タスク数',
        before: beforeHistory.completedCount,
        after: afterHistory.completedCount,
        change: afterHistory.completedCount - beforeHistory.completedCount,
        changePercent: beforeHistory.completedCount > 0
          ? ((afterHistory.completedCount - beforeHistory.completedCount) / beforeHistory.completedCount) * 100
          : 0,
        unit: '件',
        icon: <Users className="w-4 h-4" />,
      },
      {
        metric: 'actualManHours',
        label: '実績工数',
        before: beforeHistory.actualManHours,
        after: afterHistory.actualManHours,
        change: afterHistory.actualManHours - beforeHistory.actualManHours,
        changePercent: beforeHistory.actualManHours > 0
          ? ((afterHistory.actualManHours - beforeHistory.actualManHours) / beforeHistory.actualManHours) * 100
          : 0,
        unit: 'h',
        icon: <Clock className="w-4 h-4" />,
      },
      {
        metric: 'varianceManHours',
        label: '工数差異',
        before: beforeHistory.varianceManHours,
        after: afterHistory.varianceManHours,
        change: afterHistory.varianceManHours - beforeHistory.varianceManHours,
        changePercent: Math.abs(beforeHistory.varianceManHours) > 0
          ? ((afterHistory.varianceManHours - beforeHistory.varianceManHours) / Math.abs(beforeHistory.varianceManHours)) * 100
          : 0,
        unit: 'h',
        icon: <TrendingUp className="w-4 h-4" />,
      },
    ];

    return results;
  };

  // 変化の方向を示すアイコンとスタイル
  const getChangeIndicator = (change: number, isInverse = false) => {
    const isPositive = isInverse ? change < 0 : change > 0;
    const isNeutral = change === 0;

    if (isNeutral) {
      return {
        icon: <Minus className="w-4 h-4" />,
        style: 'text-gray-500',
        bgStyle: 'bg-gray-100',
      };
    } else if (isPositive) {
      return {
        icon: <TrendingUp className="w-4 h-4" />,
        style: 'text-green-600',
        bgStyle: 'bg-green-100',
      };
    } else {
      return {
        icon: <TrendingDown className="w-4 h-4" />,
        style: 'text-red-600',
        bgStyle: 'bg-red-100',
      };
    }
  };

  const comparisonResults = calculateComparison();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center p-8">
          読み込み中...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* 選択エリア */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="w-5 h-5" />
            <span>比較対象選択</span>
          </CardTitle>
          <CardDescription>
            比較したい2つの進捗履歴を選択してください
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">比較前（基準）</label>
              <Select value={beforeHistoryId} onValueChange={setBeforeHistoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="履歴を選択" />
                </SelectTrigger>
                <SelectContent>
                  {histories.map((history) => (
                    <SelectItem key={history.id} value={history.id.toString()}>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-xs">
                          {history.recordType === 'AUTO' ? '自動' : '手動'}
                        </Badge>
                        <span>
                          {format(new Date(history.recordedAt), 'MM/dd HH:mm', { locale: ja })}
                        </span>
                        {history.snapshotName && (
                          <span className="text-muted-foreground">
                            ({history.snapshotName})
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">比較後（対象）</label>
              <Select value={afterHistoryId} onValueChange={setAfterHistoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="履歴を選択" />
                </SelectTrigger>
                <SelectContent>
                  {histories.map((history) => (
                    <SelectItem key={history.id} value={history.id.toString()}>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-xs">
                          {history.recordType === 'AUTO' ? '自動' : '手動'}
                        </Badge>
                        <span>
                          {format(new Date(history.recordedAt), 'MM/dd HH:mm', { locale: ja })}
                        </span>
                        {history.snapshotName && (
                          <span className="text-muted-foreground">
                            ({history.snapshotName})
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 比較結果 */}
      {beforeHistory && afterHistory && (
        <Card>
          <CardHeader>
            <CardTitle>比較結果</CardTitle>
            <CardDescription>
              {format(new Date(beforeHistory.recordedAt), 'yyyy/MM/dd HH:mm', { locale: ja })} と{' '}
              {format(new Date(afterHistory.recordedAt), 'yyyy/MM/dd HH:mm', { locale: ja })} の比較
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {comparisonResults.map((result, index) => {
                const isVariance = result.metric === 'varianceManHours';
                const indicator = getChangeIndicator(result.change, isVariance);
                
                return (
                  <div key={result.metric}>
                    <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                      <div className="flex items-center space-x-3">
                        {result.icon}
                        <div>
                          <p className="font-medium">{result.label}</p>
                          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <span>{result.before.toFixed(1)}{result.unit}</span>
                            <ArrowRight className="w-3 h-3" />
                            <span>{result.after.toFixed(1)}{result.unit}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className={`flex items-center space-x-1 ${indicator.style}`}>
                          {indicator.icon}
                          <span className="font-bold">
                            {result.change > 0 ? '+' : ''}
                            {result.change.toFixed(1)}{result.unit}
                          </span>
                        </div>
                        {Math.abs(result.changePercent) > 0 && (
                          <div className={`text-xs ${indicator.style}`}>
                            ({result.changePercent > 0 ? '+' : ''}
                            {result.changePercent.toFixed(1)}%)
                          </div>
                        )}
                      </div>
                    </div>
                    {index < comparisonResults.length - 1 && <Separator className="my-2" />}
                  </div>
                );
              })}

              {/* タスク状況比較 */}
              <div className="mt-6">
                <h4 className="text-sm font-medium mb-4">タスク状況の変化</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-600 font-medium">未開始</p>
                    <div className="flex items-center justify-center space-x-2 mt-2">
                      <span className="text-lg font-bold">{beforeHistory.notStartedCount}</span>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      <span className="text-lg font-bold">{afterHistory.notStartedCount}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      変化: {afterHistory.notStartedCount - beforeHistory.notStartedCount > 0 ? '+' : ''}
                      {afterHistory.notStartedCount - beforeHistory.notStartedCount}
                    </p>
                  </div>
                  
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <p className="text-sm text-orange-600 font-medium">進行中</p>
                    <div className="flex items-center justify-center space-x-2 mt-2">
                      <span className="text-lg font-bold">{beforeHistory.inProgressCount}</span>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      <span className="text-lg font-bold">{afterHistory.inProgressCount}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      変化: {afterHistory.inProgressCount - beforeHistory.inProgressCount > 0 ? '+' : ''}
                      {afterHistory.inProgressCount - beforeHistory.inProgressCount}
                    </p>
                  </div>
                  
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-600 font-medium">完了</p>
                    <div className="flex items-center justify-center space-x-2 mt-2">
                      <span className="text-lg font-bold">{beforeHistory.completedCount}</span>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      <span className="text-lg font-bold">{afterHistory.completedCount}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      変化: {afterHistory.completedCount - beforeHistory.completedCount > 0 ? '+' : ''}
                      {afterHistory.completedCount - beforeHistory.completedCount}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 選択がない場合のメッセージ */}
      {(!beforeHistory || !afterHistory) && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BarChart3 className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              比較したい2つの履歴を選択してください
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}