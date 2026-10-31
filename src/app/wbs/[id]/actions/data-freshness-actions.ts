"use server";

import { z } from "zod";
import { container } from "@/lib/inversify.config";
import { SYMBOL } from "@/types/symbol";
import type {
  IDataFreshnessApplicationService,
  DataFreshnessDto,
} from "@/applications/data-freshness/data-freshness-application-service";

const getDataFreshnessSchema = z.object({
  wbsId: z.number().int().positive(),
  projectId: z.string().min(1),
});

/**
 * データの鮮度（WBSの最終同期・実績の入力漏れ・タスクデータの不備）を返す。
 * 入力が不正な場合は null を返す。
 */
export async function getDataFreshness(
  wbsId: number,
  projectId: string
): Promise<DataFreshnessDto | null> {
  const parsed = getDataFreshnessSchema.safeParse({ wbsId, projectId });
  if (!parsed.success) return null;

  const service = container.get<IDataFreshnessApplicationService>(
    SYMBOL.IDataFreshnessApplicationService
  );
  return service.getDataFreshness(parsed.data.wbsId, parsed.data.projectId);
}
