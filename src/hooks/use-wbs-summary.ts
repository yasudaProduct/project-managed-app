import { useQuery } from "@tanstack/react-query";
import { WbsSummaryResult } from "@/applications/wbs/query/wbs-summary-result";
import { getWbsSummary } from "@/app/wbs/[id]/wbs-summary-actions";

/**
 * WBSの集計を取得するフック
 * @param projectId プロジェクトID
 * @param wbsId WBSID
 * @returns WBSの集計
 */
export function useWbsSummary(projectId: string, wbsId: number) {
  return useQuery<WbsSummaryResult>({
    queryKey: ["wbsSummary", projectId, wbsId],
    queryFn: () => getWbsSummary(projectId, wbsId),
    enabled: !!projectId && !!wbsId,
  });
}