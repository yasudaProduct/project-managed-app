"use client";

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Users, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { GanttHeader } from '@/components/assignee-gantt/gantt-header';
import { GanttRow } from '@/components/assignee-gantt/gantt-row';
import { getAssigneeWorkloads } from '@/app/actions/assignee-gantt-actions';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';

interface AssigneeGanttChartWrapperProps {
  wbsId: number;
}

type ViewMode = 'week' | 'month';

// UI用のデータ型定義
interface TaskAllocationUI {
  taskId: string;
  taskName: string;
  allocatedHours: number;
}

interface DailyWorkAllocationUI {
  date: Date;
  availableHours: number;
  taskAllocations: TaskAllocationUI[];
  allocatedHours: number;
  isOverloaded: boolean;
  utilizationRate: number;
  overloadedHours: number;
  isWeekend: boolean;
  isCompanyHoliday: boolean;
  userSchedules: { title: string; startTime: string; endTime: string; durationHours: number }[];
  isOverloadedByStandard: boolean;
  overloadedByStandardHours: number;
}

interface AssigneeWorkloadUI {
  assigneeId: string;
  assigneeName: string;
  dailyAllocations: DailyWorkAllocationUI[];
  overloadedDays: DailyWorkAllocationUI[];
}

export function AssigneeGanttChartWrapper({ wbsId }: AssigneeGanttChartWrapperProps) {
  const [workloads, setWorkloads] = useState<AssigneeWorkloadUI[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedAssignee, setSelectedAssignee] = useState<AssigneeWorkloadUI | null>(null);
  const [selectedAllocation, setSelectedAllocation] = useState<DailyWorkAllocationUI | null>(null);

  // 日付範囲を計算
  const getDateRange = (mode: ViewMode, baseDate: Date): Date[] => {
    const dates: Date[] = [];
    let startDate: Date;
    let endDate: Date;

    switch (mode) {
      case 'week':
        // 週の始まり（月曜日）を取得
        startDate = new Date(baseDate);
        const dayOfWeek = startDate.getDay();
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        startDate.setDate(startDate.getDate() + mondayOffset);
        
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        break;
        
      case 'month':
        startDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
        endDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0);
        break;
        
      default:
        // デフォルトは現在日から2週間
        startDate = new Date(baseDate);
        endDate = new Date(baseDate);
        endDate.setDate(startDate.getDate() + 13);
    }

    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      dates.push(new Date(date));
    }

    return dates;
  };

  const dateRange = getDateRange(viewMode, currentDate);

  // データ取得用のServer Action呼び出し
  const fetchWorkloads = useCallback(async () => {
    const currentDateRange = getDateRange(viewMode, currentDate);
    if (!currentDateRange.length) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const startDate = currentDateRange[0];
      const endDate = currentDateRange[currentDateRange.length - 1];
      
      const result = await getAssigneeWorkloads(
        wbsId,
        startDate.toISOString(),
        endDate.toISOString()
      );

      if (!result.success || !result.data) {
        throw new Error(result.error || '作業負荷の取得に失敗しました');
      }

      const data = result.data;
      
      // プレーンなデータからUI用オブジェクトに変換
      const workloadObjects: AssigneeWorkloadUI[] = data.map(workloadData => {
        const dailyAllocations: DailyWorkAllocationUI[] = workloadData.dailyAllocations.map(daily => {
          const taskAllocations: TaskAllocationUI[] = daily.taskAllocations.map(task => ({
            taskId: task.taskId,
            taskName: task.taskName,
            allocatedHours: task.allocatedHours
          }));

          const allocatedHours = taskAllocations.reduce((sum, t) => sum + t.allocatedHours, 0);
          const isOverloaded = allocatedHours > daily.availableHours; // availableHours基準
          const utilizationRate = daily.availableHours === 0 ? 0 : allocatedHours / daily.availableHours;
          const overloadedHours = isOverloaded ? allocatedHours - daily.availableHours : 0;
          const isOverloadedByStandard = allocatedHours > 7.5; // 標準7.5h基準
          const overloadedByStandardHours = isOverloadedByStandard ? allocatedHours - 7.5 : 0;

          return {
            date: new Date(daily.date),
            availableHours: daily.availableHours,
            taskAllocations,
            allocatedHours,
            isOverloaded,
            utilizationRate,
            overloadedHours,
            isWeekend: !!daily.isWeekend,
            isCompanyHoliday: !!daily.isCompanyHoliday,
            userSchedules: daily.userSchedules || [],
            isOverloadedByStandard,
            overloadedByStandardHours
          };
        });

        const overloadedDays = dailyAllocations.filter(d => d.isOverloaded);

        return {
          assigneeId: workloadData.assigneeId,
          assigneeName: workloadData.assigneeName,
          dailyAllocations,
          overloadedDays
        };
      });

      setWorkloads(workloadObjects);
    } catch (err) {
      setError(err instanceof Error ? err.message : '作業負荷の取得に失敗しました');
      setWorkloads([]);
    } finally {
      setLoading(false);
    }
  }, [wbsId, viewMode, currentDate]);

  useEffect(() => {
    fetchWorkloads();
  }, [fetchWorkloads]);

  // ナビゲーション
  const navigatePrevious = () => {
    const newDate = new Date(currentDate);
    switch (viewMode) {
      case 'week':
        newDate.setDate(newDate.getDate() - 7);
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() - 1);
        break;
      default:
        newDate.setDate(newDate.getDate() - 14);
    }
    setCurrentDate(newDate);
  };

  const navigateNext = () => {
    const newDate = new Date(currentDate);
    switch (viewMode) {
      case 'week':
        newDate.setDate(newDate.getDate() + 7);
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() + 1);
        break;
      default:
        newDate.setDate(newDate.getDate() + 14);
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // セル クリック処理
  const handleCellClick = (assigneeId: string, date: Date) => {
    const workload = workloads.find(w => w.assigneeId === assigneeId) || null;
    let allocation: DailyWorkAllocationUI | null = workload?.dailyAllocations.find(d => d.date.toDateString() === date.toDateString()) || null;

    if (!allocation) {
      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      allocation = {
        date,
        availableHours: isWeekend ? 0 : 7.5,
        taskAllocations: [],
        allocatedHours: 0,
        isOverloaded: false,
        utilizationRate: 0,
        overloadedHours: 0,
        isWeekend,
        isCompanyHoliday: isWeekend,
        userSchedules: [],
        isOverloadedByStandard: false,
        overloadedByStandardHours: 0,
      };
    }

    setSelectedAssignee(workload);
    setSelectedAllocation(allocation);
    setIsSheetOpen(true);
  };

  // 過負荷状態の担当者数を計算
  const overloadedAssignees = workloads.filter(workload => 
    workload.overloadedDays.length > 0
  );

  // 表示期間のフォーマット
  const formatPeriod = () => {
    if (!dateRange.length) return '';
    
    const start = dateRange[0];
    const end = dateRange[dateRange.length - 1];
    
    if (viewMode === 'month') {
      return `${start.getFullYear()}年${start.getMonth() + 1}月`;
    }
    
    return `${start.toLocaleDateString('ja-JP')} - ${end.toLocaleDateString('ja-JP')}`;
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">作業負荷を読み込み中...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            <Calendar className="h-5 w-5 text-blue-600" />
            担当者別ガントチャート
            {overloadedAssignees.length > 0 && (
              <div className="flex items-center gap-1 ml-2 px-2 py-1 bg-red-100 text-red-800 rounded text-sm">
                <AlertTriangle className="h-4 w-4" />
                過負荷: {overloadedAssignees.length}名
              </div>
            )}
          </CardTitle>

          <div className="flex items-center gap-2">
            <Select value={viewMode} onValueChange={(value: ViewMode) => setViewMode(value)}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">週表示</SelectItem>
                <SelectItem value="month">月表示</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={navigatePrevious}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToToday}>
                今日
              </Button>
              <Button variant="outline" size="sm" onClick={navigateNext}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>期間: {formatPeriod()}</span>
          <span>担当者: {workloads.length}名</span>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {error ? (
          <div className="p-8 text-center">
            <div className="text-red-600 mb-2">エラーが発生しました</div>
            <div className="text-sm text-gray-600 mb-4">{error}</div>
            <Button onClick={fetchWorkloads} variant="outline" size="sm">
              再試行
            </Button>
          </div>
        ) : workloads.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            担当者のデータがありません
          </div>
        ) : (
          <div className="overflow-auto max-h-[600px]">
            <div className="min-w-fit">
              <GanttHeader 
                dateRange={dateRange}
                onDateClick={(date) => console.log('Date clicked:', date)}
              />
              
              {workloads.map((workload) => (
                <GanttRow
                  key={workload.assigneeId}
                  assignee={workload}
                  dateRange={dateRange}
                  onCellClick={handleCellClick}
                />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>

    <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
      <SheetContent className="w-[520px] sm:w-[640px] overflow-y-auto">
        {selectedAssignee && selectedAllocation && (
          <>
            <SheetHeader>
              <SheetTitle>
                {selectedAssignee.assigneeName} - {selectedAllocation.date.toLocaleDateString('ja-JP')}
              </SheetTitle>
              <SheetDescription>
                選択した日の作業負荷詳細
              </SheetDescription>
            </SheetHeader>

            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded">
                <div className="text-sm">
                  <div className="text-gray-500">予定工数</div>
                  <div className="font-medium">{selectedAllocation.allocatedHours.toFixed(2)}h</div>
                </div>
                <div className="text-sm">
                  <div className="text-gray-500">稼働可能時間</div>
                  <div className="font-medium">{selectedAllocation.availableHours.toFixed(2)}h</div>
                </div>
                <div className="text-sm">
                  <div className="text-gray-500">稼働率</div>
                  <div className={selectedAllocation.isOverloaded ? 'font-medium text-red-600' : 'font-medium text-green-600'}>
                    {(selectedAllocation.utilizationRate * 100).toFixed(2)}%
                  </div>
                </div>
                <div className="text-sm">
                  <div className="text-gray-500">状態</div>
                  <div className={selectedAllocation.isOverloaded || selectedAllocation.isOverloadedByStandard ? 'font-medium text-red-600' : 'font-medium text-gray-700'}>
                    {selectedAllocation.isOverloaded ? `過負荷 (+${selectedAllocation.overloadedHours.toFixed(2)}h)` : '適正'}
                    {selectedAllocation.isOverloadedByStandard && !selectedAllocation.isOverloaded && ` / 標準超過 (+${selectedAllocation.overloadedByStandardHours.toFixed(2)}h)`}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-semibold">タスク詳細</div>
                {selectedAllocation.taskAllocations.length > 0 ? (
                  <div className="space-y-2">
                    {selectedAllocation.taskAllocations.map((t, i) => (
                      <div key={i} className="flex items-center justify-between text-sm border rounded p-2">
                        <div className="font-medium truncate mr-2">{t.taskName}</div>
                        <div className="text-gray-600">{t.allocatedHours.toFixed(2)}h</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">タスクはありません</div>
                )}
              </div>

              {selectedAllocation.userSchedules && selectedAllocation.userSchedules.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-semibold">個人予定</div>
                  <div className="space-y-1 text-xs text-gray-700">
                    {selectedAllocation.userSchedules.map((s, i) => (
                      <div key={i} className="flex items-center justify-between border rounded p-2">
                        <span className="mr-2">{s.title}</span>
                        <span>{s.startTime} - {s.endTime} ({s.durationHours.toFixed(1)}h)</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
    </>
  );
}