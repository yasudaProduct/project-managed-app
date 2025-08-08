'use client';

/**
 * WBS進捗履歴一覧ページ
 */

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Plus, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { useProgressHistories, useCreateSnapshot } from '@/hooks/use-progress-history';
import { ProgressHistoryDetail } from '@/components/wbs/progress-history-detail';
import { CreateSnapshotDialog } from '@/components/wbs/create-snapshot-dialog';
import { ProgressComparison } from '@/components/wbs/progress-comparison';
import { ProgressTimeline } from '@/components/wbs/progress-timeline';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

export default function ProgressHistoryPage() {
  const params = useParams();
  const wbsId = parseInt(params.id as string);

  // 状態管理
  const [activeTab, setActiveTab] = useState<'list' | 'timeline' | 'comparison'>('list');
  const [currentPage, setCurrentPage] = useState(1);
  const [recordTypeFilter, setRecordTypeFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedHistoryId, setSelectedHistoryId] = useState<number | null>(null);
  const [showCreateSnapshot, setShowCreateSnapshot] = useState(false);

  // データ取得
  const {
    data: historiesData,
    isLoading,
    error,
    refetch,
  } = useProgressHistories(wbsId, {
    page: currentPage,
    limit: 20,
    recordType: recordTypeFilter === 'all' ? undefined : recordTypeFilter,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  const createSnapshotMutation = useCreateSnapshot(wbsId);

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

  // 記録タイプのバッジ色
  const getRecordTypeBadgeVariant = (recordType: string) => {
    switch (recordType) {
      case 'AUTO':
        return 'secondary';
      case 'MANUAL_SNAPSHOT':
        return 'default';
      default:
        return 'outline';
    }
  };

  // フィルターのクリア
  const clearFilters = () => {
    setRecordTypeFilter('all');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  if (isLoading) {
    return <div className="flex justify-center p-8">読み込み中...</div>;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <p className="text-red-600">エラーが発生しました</p>
        <Button onClick={() => refetch()}>再試行</Button>
      </div>
    );
  }

  const { histories, pagination } = historiesData || { histories: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* ヘッダー */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">進捗履歴</h1>
          <p className="text-muted-foreground">WBS進捗の履歴を確認できます</p>
        </div>
        <Button onClick={() => setShowCreateSnapshot(true)}>
          <Plus className="w-4 h-4 mr-2" />
          スナップショット作成
        </Button>
      </div>

      {/* タブナビゲーション */}
      <div className="flex space-x-1 p-1 bg-muted rounded-lg w-fit">
        <Button
          variant={activeTab === 'list' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('list')}
        >
          一覧表示
        </Button>
        <Button
          variant={activeTab === 'timeline' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('timeline')}
        >
          タイムライン
        </Button>
        <Button
          variant={activeTab === 'comparison' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('comparison')}
        >
          比較分析
        </Button>
      </div>

      {/* フィルター（一覧表示時のみ） */}
      {activeTab === 'list' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Filter className="w-4 h-4 mr-2" />
              フィルター
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium">記録タイプ</label>
                <Select value={recordTypeFilter} onValueChange={setRecordTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="すべて" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">すべて</SelectItem>
                    <SelectItem value="AUTO">自動記録</SelectItem>
                    <SelectItem value="MANUAL_SNAPSHOT">手動スナップショット</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">開始日</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">終了日</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button variant="outline" onClick={clearFilters}>
                  クリア
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* コンテンツエリア */}
      {activeTab === 'list' && (
        <>
          {/* 履歴一覧 */}
          <div className="grid gap-4">
            {histories.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Calendar className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">進捗履歴がありません</p>
                </CardContent>
              </Card>
            ) : (
              histories.map((history) => (
                <Card key={history.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-6" onClick={() => setSelectedHistoryId(history.id)}>
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                      {/* 基本情報 */}
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Badge variant={getRecordTypeBadgeVariant(history.recordType)}>
                            {getRecordTypeLabel(history.recordType)}
                          </Badge>
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Clock className="w-3 h-3 mr-1" />
                            {format(new Date(history.recordedAt), 'yyyy/MM/dd HH:mm', { locale: ja })}
                          </div>
                        </div>
                        {history.snapshotName && (
                          <p className="text-sm font-medium">{history.snapshotName}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          タスク履歴: {history.taskHistoriesCount}件
                        </p>
                      </div>

                      {/* 進捗統計 */}
                      <div className="space-y-2">
                        <p className="text-sm font-medium">タスク進捗</p>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div className="text-center">
                            <div className="text-blue-600 font-bold">{history.notStartedCount}</div>
                            <div className="text-muted-foreground">未開始</div>
                          </div>
                          <div className="text-center">
                            <div className="text-orange-600 font-bold">{history.inProgressCount}</div>
                            <div className="text-muted-foreground">進行中</div>
                          </div>
                          <div className="text-center">
                            <div className="text-green-600 font-bold">{history.completedCount}</div>
                            <div className="text-muted-foreground">完了</div>
                          </div>
                        </div>
                      </div>

                      {/* 完了率 */}
                      <div className="space-y-2">
                        <p className="text-sm font-medium">完了率</p>
                        <div className="flex items-center space-x-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-green-600 h-2 rounded-full"
                              style={{ width: `${Math.min(history.completionRate, 100)}%` }}
                            />
                          </div>
                          <span className="text-sm font-bold">{history.completionRate.toFixed(1)}%</span>
                        </div>
                      </div>

                      {/* 工数情報 */}
                      <div className="space-y-2">
                        <p className="text-sm font-medium">工数</p>
                        <div className="text-xs space-y-1">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">予定:</span>
                            <span>{history.plannedManHours.toFixed(1)}h</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">実績:</span>
                            <span>{history.actualManHours.toFixed(1)}h</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">差異:</span>
                            <span className={history.varianceManHours >= 0 ? 'text-red-600' : 'text-green-600'}>
                              {history.varianceManHours > 0 ? '+' : ''}
                              {history.varianceManHours.toFixed(1)}h
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* ページネーション */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-center items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(pagination.page - 1)}
                disabled={pagination.page === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm">
                {pagination.page} / {pagination.totalPages} ページ
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </>
      )}

      {/* タイムライン表示 */}
      {activeTab === 'timeline' && (
        <ProgressTimeline wbsId={wbsId} />
      )}

      {/* 比較分析 */}
      {activeTab === 'comparison' && (
        <ProgressComparison wbsId={wbsId} />
      )}

      {/* 進捗履歴詳細ダイアログ */}
      {selectedHistoryId && (
        <ProgressHistoryDetail
          historyId={selectedHistoryId}
          open={!!selectedHistoryId}
          onOpenChange={() => setSelectedHistoryId(null)}
        />
      )}

      {/* スナップショット作成ダイアログ */}
      <CreateSnapshotDialog
        open={showCreateSnapshot}
        onOpenChange={setShowCreateSnapshot}
        onCreateSnapshot={createSnapshotMutation.mutate}
        isLoading={createSnapshotMutation.isPending}
      />
    </div>
  );
}