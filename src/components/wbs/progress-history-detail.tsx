'use client';

/**
 * WBS進捗履歴詳細表示コンポーネント
 */

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Calendar, Clock, User, Briefcase, TrendingUp, Timer } from 'lucide-react';
import { useProgressHistoryDetail } from '@/hooks/use-progress-history';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

interface ProgressHistoryDetailProps {
  historyId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProgressHistoryDetail({
  historyId,
  open,
  onOpenChange,
}: ProgressHistoryDetailProps) {
  const { data: history, isLoading, error } = useProgressHistoryDetail(historyId);

  // 記録タイプのラベル
  const getRecordTypeLabel = (recordType: string) => {
    switch (recordType) {
      case 'AUTO':
        return '自動記録';
      case 'MANUAL_SNAPSHOT':
        return '手動スナップショット';
      default:
        return recordType;
    }
  };

  // ステータスのラベル
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'NOT_STARTED':
        return '未開始';
      case 'IN_PROGRESS':
        return '進行中';
      case 'COMPLETED':
        return '完了';
      default:
        return status;
    }
  };

  // ステータスのバッジ色
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'NOT_STARTED':
        return 'secondary';
      case 'IN_PROGRESS':
        return 'default';
      case 'COMPLETED':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[80vh]">
          <div className="flex justify-center p-8">読み込み中...</div>
        </DialogContent>
      </Dialog>
    );
  }

  if (error || !history) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[80vh]">
          <div className="flex justify-center p-8 text-red-600">
            エラーが発生しました
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Calendar className="w-5 h-5" />
            <span>進捗履歴詳細</span>
          </DialogTitle>
          <DialogDescription>
            {format(new Date(history.recordedAt), 'yyyy年MM月dd日 HH:mm', { locale: ja })} 時点の進捗状況
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {/* 基本情報 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="w-4 h-4" />
                  <span>基本情報</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">記録タイプ</p>
                    <Badge variant="outline">
                      {getRecordTypeLabel(history.recordType)}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">記録日時</p>
                    <p className="text-sm font-medium">
                      {format(new Date(history.recordedAt), 'yyyy/MM/dd HH:mm', { locale: ja })}
                    </p>
                  </div>
                  {history.snapshotName && (
                    <div className="col-span-2">
                      <p className="text-sm text-muted-foreground">スナップショット名</p>
                      <p className="text-sm font-medium">{history.snapshotName}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 進捗サマリー */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4" />
                  <span>進捗サマリー</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* タスク進捗 */}
                  <div className="space-y-3">
                    <p className="text-sm font-medium">タスク進捗</p>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">総タスク数</span>
                        <span className="font-bold">{history.totalTaskCount}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-blue-600">未開始</span>
                        <span className="font-bold text-blue-600">{history.notStartedCount}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-orange-600">進行中</span>
                        <span className="font-bold text-orange-600">{history.inProgressCount}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-green-600">完了</span>
                        <span className="font-bold text-green-600">{history.completedCount}</span>
                      </div>
                    </div>
                  </div>

                  {/* 完了率 */}
                  <div className="space-y-3">
                    <p className="text-sm font-medium">完了率</p>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-3">
                          <div
                            className="bg-green-600 h-3 rounded-full"
                            style={{ width: `${Math.min(history.completionRate, 100)}%` }}
                          />
                        </div>
                      </div>
                      <p className="text-center text-2xl font-bold text-green-600">
                        {history.completionRate.toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  {/* 工数情報 */}
                  <div className="space-y-3">
                    <p className="text-sm font-medium">工数情報</p>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">予定工数</span>
                        <span className="font-bold">{history.plannedManHours.toFixed(1)}h</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">実績工数</span>
                        <span className="font-bold">{history.actualManHours.toFixed(1)}h</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">差異</span>
                        <span className={`font-bold ${
                          history.varianceManHours >= 0 ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {history.varianceManHours > 0 ? '+' : ''}
                          {history.varianceManHours.toFixed(1)}h
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* タスク詳細 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Briefcase className="w-4 h-4" />
                  <span>タスク詳細 ({history.taskHistories.length}件)</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {history.taskHistories.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      タスクデータがありません
                    </p>
                  ) : (
                    history.taskHistories.map((task, index) => (
                      <div key={task.id}>
                        <div className="grid grid-cols-1 lg:grid-cols-6 gap-4 p-4 bg-muted/30 rounded-lg">
                          {/* タスク基本情報 */}
                          <div className="lg:col-span-2 space-y-2">
                            <div className="flex items-center space-x-2">
                              <Badge variant="outline" className="text-xs">
                                {task.taskNo}
                              </Badge>
                              <Badge variant={getStatusBadgeVariant(task.status)}>
                                {getStatusLabel(task.status)}
                              </Badge>
                            </div>
                            <p className="font-medium text-sm">{task.taskName}</p>
                            {task.phaseName && (
                              <p className="text-xs text-muted-foreground">
                                フェーズ: {task.phaseName}
                              </p>
                            )}
                          </div>

                          {/* 担当者情報 */}
                          <div className="space-y-1">
                            <div className="flex items-center space-x-1">
                              <User className="w-3 h-3" />
                              <span className="text-xs text-muted-foreground">担当者</span>
                            </div>
                            <p className="text-sm">{task.assigneeName || '未設定'}</p>
                          </div>

                          {/* 期間情報 */}
                          <div className="space-y-1">
                            <div className="flex items-center space-x-1">
                              <Calendar className="w-3 h-3" />
                              <span className="text-xs text-muted-foreground">期間</span>
                            </div>
                            <div className="text-xs space-y-1">
                              {task.plannedStartDate && task.plannedEndDate && (
                                <div>
                                  <span className="text-muted-foreground">予定: </span>
                                  {format(new Date(task.plannedStartDate), 'MM/dd', { locale: ja })} - 
                                  {format(new Date(task.plannedEndDate), 'MM/dd', { locale: ja })}
                                </div>
                              )}
                              {task.actualStartDate && task.actualEndDate && (
                                <div>
                                  <span className="text-muted-foreground">実績: </span>
                                  {format(new Date(task.actualStartDate), 'MM/dd', { locale: ja })} - 
                                  {format(new Date(task.actualEndDate), 'MM/dd', { locale: ja })}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* 工数情報 */}
                          <div className="space-y-1">
                            <div className="flex items-center space-x-1">
                              <Timer className="w-3 h-3" />
                              <span className="text-xs text-muted-foreground">工数</span>
                            </div>
                            <div className="text-xs space-y-1">
                              <div>
                                <span className="text-muted-foreground">予定: </span>
                                {task.plannedManHours.toFixed(1)}h
                              </div>
                              <div>
                                <span className="text-muted-foreground">実績: </span>
                                {task.actualManHours.toFixed(1)}h
                              </div>
                            </div>
                          </div>

                          {/* 進捗率 */}
                          <div className="space-y-1">
                            <div className="flex items-center space-x-1">
                              <TrendingUp className="w-3 h-3" />
                              <span className="text-xs text-muted-foreground">進捗</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className="flex-1 bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-green-600 h-2 rounded-full"
                                  style={{ width: `${Math.min(task.progressRate, 100)}%` }}
                                />
                              </div>
                              <span className="text-xs font-bold">
                                {task.progressRate.toFixed(0)}%
                              </span>
                            </div>
                          </div>
                        </div>
                        {index < history.taskHistories.length - 1 && (
                          <Separator className="my-2" />
                        )}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}