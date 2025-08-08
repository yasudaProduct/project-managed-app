'use client';

/**
 * WBS進捗タイムライン表示コンポーネント
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Calendar,
  Clock,
  TrendingUp,
  Camera,
  RefreshCw,
  Circle,
  CheckCircle,
  PlayCircle,
  PauseCircle
} from 'lucide-react';
import { useProgressHistories } from '@/hooks/use-progress-history';
import type { ProgressHistorySummary } from '@/hooks/use-progress-history';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

interface ProgressTimelineProps {
  wbsId: number;
}

interface TimelineItem extends ProgressHistorySummary {
  isFirst: boolean;
  isLast: boolean;
  timeDiff?: string;
}

export function ProgressTimeline({ wbsId }: ProgressTimelineProps) {
  // 履歴データ取得（タイムライン用に多めに取得）
  const { data: historiesData, isLoading, error } = useProgressHistories(wbsId, {
    limit: 50,
  });

  const histories = historiesData?.histories || [];

  // タイムライン用データの準備
  const timelineItems: TimelineItem[] = histories.map((history, index) => {
    const isFirst = index === 0;
    const isLast = index === histories.length - 1;
    
    // 前の記録からの経過時間を計算
    let timeDiff: string | undefined;
    if (!isFirst) {
      const current = new Date(history.recordedAt);
      const previous = new Date(histories[index - 1].recordedAt);
      const diffMs = previous.getTime() - current.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHours / 24);
      
      if (diffDays > 0) {
        timeDiff = `${diffDays}日前`;
      } else if (diffHours > 0) {
        timeDiff = `${diffHours}時間前`;
      } else {
        timeDiff = '直前';
      }
    }
    
    return {
      ...history,
      isFirst,
      isLast,
      timeDiff,
    };
  });

  // 記録タイプのアイコン
  const getRecordTypeIcon = (recordType: string) => {
    switch (recordType) {
      case 'AUTO':
        return <RefreshCw className="w-4 h-4" />;
      case 'MANUAL_SNAPSHOT':
        return <Camera className="w-4 h-4" />;
      default:
        return <Circle className="w-4 h-4" />;
    }
  };

  // 進捗状況に基づくアイコン
  const getProgressIcon = (completionRate: number) => {
    if (completionRate >= 100) {
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    } else if (completionRate >= 50) {
      return <PlayCircle className="w-4 h-4 text-blue-600" />;
    } else if (completionRate > 0) {
      return <PlayCircle className="w-4 h-4 text-orange-600" />;
    } else {
      return <PauseCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  // 変化の計算
  const getProgressChange = (current: ProgressHistorySummary, previous?: ProgressHistorySummary) => {
    if (!previous) return null;
    
    const completionChange = current.completionRate - previous.completionRate;
    const taskChange = current.completedCount - previous.completedCount;
    
    return {
      completionChange,
      taskChange,
    };
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center p-8">
          読み込み中...
        </CardContent>
      </Card>
    );
  }

  if (error || histories.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Calendar className="w-12 h-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            {error ? 'データの取得に失敗しました' : 'タイムラインデータがありません'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Calendar className="w-5 h-5" />
          <span>進捗タイムライン</span>
        </CardTitle>
        <CardDescription>
          WBSの進捗変化を時系列で表示します（最新 {histories.length} 件）
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] pr-4">
          <div className="relative">
            {/* タイムライン線 */}
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-border" />
            
            {/* タイムラインアイテム */}
            <div className="space-y-8">
              {timelineItems.map((item, index) => {
                const previousItem = index > 0 ? timelineItems[index - 1] : undefined;
                const change = getProgressChange(item, previousItem);
                
                return (
                  <div key={item.id} className="relative flex items-start space-x-4">
                    {/* タイムラインポイント */}
                    <div className="relative z-10 flex items-center justify-center w-16 h-16 bg-background border-2 border-border rounded-full">
                      <div className="flex flex-col items-center">
                        {getRecordTypeIcon(item.recordType)}
                        {getProgressIcon(item.completionRate)}
                      </div>
                    </div>
                    
                    {/* コンテンツエリア */}
                    <div className="flex-1 min-w-0 pb-8">
                      {/* ヘッダー */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Badge variant={item.recordType === 'AUTO' ? 'secondary' : 'default'}>
                            {item.recordType === 'AUTO' ? '自動記録' : '手動スナップショット'}
                          </Badge>
                          {item.timeDiff && (
                            <span className="text-sm text-muted-foreground">
                              {item.timeDiff}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Clock className="w-3 h-3 mr-1" />
                          {format(new Date(item.recordedAt), 'MM/dd HH:mm', { locale: ja })}
                        </div>
                      </div>
                      
                      {/* スナップショット名 */}
                      {item.snapshotName && (
                        <h4 className="font-medium text-sm mb-3">{item.snapshotName}</h4>
                      )}
                      
                      {/* 進捗情報カード */}
                      <Card className="bg-muted/20">
                        <CardContent className="p-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {/* 完了率 */}
                            <div className="text-center">
                              <div className="flex items-center justify-center space-x-1 mb-1">
                                <TrendingUp className="w-3 h-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">完了率</span>
                              </div>
                              <div className="flex items-center justify-center space-x-1">
                                <span className="text-lg font-bold">
                                  {item.completionRate.toFixed(1)}%
                                </span>
                                {change && change.completionChange !== 0 && (
                                  <span className={`text-xs ${
                                    change.completionChange > 0 ? 'text-green-600' : 'text-red-600'
                                  }`}>
                                    ({change.completionChange > 0 ? '+' : ''}
                                    {change.completionChange.toFixed(1)}%)
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            {/* 完了タスク */}
                            <div className="text-center">
                              <div className="text-xs text-muted-foreground mb-1">完了タスク</div>
                              <div className="flex items-center justify-center space-x-1">
                                <span className="text-lg font-bold text-green-600">
                                  {item.completedCount}
                                </span>
                                {change && change.taskChange !== 0 && (
                                  <span className={`text-xs ${
                                    change.taskChange > 0 ? 'text-green-600' : 'text-red-600'
                                  }`}>
                                    ({change.taskChange > 0 ? '+' : ''}{change.taskChange})
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            {/* 実績工数 */}
                            <div className="text-center">
                              <div className="text-xs text-muted-foreground mb-1">実績工数</div>
                              <span className="text-sm font-medium">
                                {item.actualManHours.toFixed(1)}h
                              </span>
                            </div>
                            
                            {/* 工数差異 */}
                            <div className="text-center">
                              <div className="text-xs text-muted-foreground mb-1">工数差異</div>
                              <span className={`text-sm font-medium ${
                                item.varianceManHours >= 0 ? 'text-red-600' : 'text-green-600'
                              }`}>
                                {item.varianceManHours > 0 ? '+' : ''}
                                {item.varianceManHours.toFixed(1)}h
                              </span>
                            </div>
                          </div>
                          
                          {/* タスク状況 */}
                          <div className="mt-4 pt-4 border-t border-border/50">
                            <div className="grid grid-cols-3 gap-2 text-xs">
                              <div className="text-center">
                                <div className="text-blue-600 font-bold">{item.notStartedCount}</div>
                                <div className="text-muted-foreground">未開始</div>
                              </div>
                              <div className="text-center">
                                <div className="text-orange-600 font-bold">{item.inProgressCount}</div>
                                <div className="text-muted-foreground">進行中</div>
                              </div>
                              <div className="text-center">
                                <div className="text-green-600 font-bold">{item.completedCount}</div>
                                <div className="text-muted-foreground">完了</div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}