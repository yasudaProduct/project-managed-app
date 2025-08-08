/**
 * WBS進捗履歴用のReact Queryフック
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export type ProgressHistorySummary = {
  id: number;
  recordedAt: string;
  recordType: string;
  snapshotName?: string;
  totalTaskCount: number;
  completedCount: number;
  inProgressCount: number;
  notStartedCount: number;
  completionRate: number;
  plannedManHours: number;
  actualManHours: number;
  varianceManHours: number;
  taskHistoriesCount: number;
};

export type ProgressHistoryDetail = {
  id: number;
  wbsId: number;
  recordedAt: string;
  recordType: string;
  snapshotName?: string;
  totalTaskCount: number;
  completedCount: number;
  inProgressCount: number;
  notStartedCount: number;
  completionRate: number;
  plannedManHours: number;
  actualManHours: number;
  varianceManHours: number;
  metadata?: Record<string, unknown>;
  taskHistories: Array<{
    id: number;
    taskId: number;
    taskNo: string;
    taskName: string;
    status: string;
    assigneeId?: number;
    assigneeName?: string;
    phaseId?: number;
    phaseName?: string;
    plannedStartDate?: string;
    plannedEndDate?: string;
    actualStartDate?: string;
    actualEndDate?: string;
    plannedManHours: number;
    actualManHours: number;
    progressRate: number;
  }>;
  createdAt: string;
  updatedAt: string;
};

export type HistoryQueryParams = {
  page?: number;
  limit?: number;
  recordType?: string;
  startDate?: string;
  endDate?: string;
};

export type HistoryListResponse = {
  histories: ProgressHistorySummary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

// 進捗履歴一覧取得
export function useProgressHistories(wbsId: number, params: HistoryQueryParams = {}) {
  return useQuery<HistoryListResponse>({
    queryKey: ['progressHistories', wbsId, params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params.page) searchParams.append('page', params.page.toString());
      if (params.limit) searchParams.append('limit', params.limit.toString());
      if (params.recordType) searchParams.append('recordType', params.recordType);
      if (params.startDate) searchParams.append('startDate', params.startDate);
      if (params.endDate) searchParams.append('endDate', params.endDate);

      const response = await fetch(`/api/wbs/${wbsId}/history?${searchParams.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch progress histories');
      }
      return response.json();
    },
    enabled: !!wbsId,
  });
}

// 進捗履歴詳細取得
export function useProgressHistoryDetail(historyId: number | null) {
  return useQuery<ProgressHistoryDetail>({
    queryKey: ['progressHistoryDetail', historyId],
    queryFn: async () => {
      const response = await fetch(`/api/wbs/history/${historyId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch progress history detail');
      }
      return response.json();
    },
    enabled: !!historyId,
  });
}

// スナップショット作成
export function useCreateSnapshot(wbsId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (snapshotName?: string) => {
      const response = await fetch(`/api/wbs/${wbsId}/snapshot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ snapshotName }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create snapshot');
      }

      return response.json();
    },
    onSuccess: () => {
      // 進捗履歴一覧を無効化して再取得
      queryClient.invalidateQueries({ queryKey: ['progressHistories', wbsId] });
    },
  });
}