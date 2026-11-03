"use server";

import { container } from "@/lib/inversify.config";
import { SYMBOL } from "@/types/symbol";
import type { IQueryBus } from "@/applications/shared/cqrs/base-classes";
import { GetEstimationAccuracyQuery } from "@/applications/estimation-accuracy/get-estimation-accuracy-query";
import type { EstimationAccuracyResult } from "@/applications/estimation-accuracy/get-estimation-accuracy-handler";

/** 完了タスクの見積精度（実績 / 基準）を工程テンプレート別・プロジェクト×工程別に集計する */
export async function getEstimationAccuracy(): Promise<EstimationAccuracyResult> {
  const queryBus = container.get<IQueryBus>(SYMBOL.IQueryBus);
  return queryBus.execute<EstimationAccuracyResult>(new GetEstimationAccuracyQuery());
}
