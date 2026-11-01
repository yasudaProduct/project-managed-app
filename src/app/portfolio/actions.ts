"use server";

import { container } from "@/lib/inversify.config";
import { SYMBOL } from "@/types/symbol";
import type {
  IPortfolioApplicationService,
  PortfolioRowDto,
} from "@/applications/portfolio/portfolio-application-service";

/** 未開始・進行中プロジェクトの最新WBSごとの健全性一覧（危ない順） */
export async function listPortfolio(): Promise<PortfolioRowDto[]> {
  const service = container.get<IPortfolioApplicationService>(
    SYMBOL.IPortfolioApplicationService
  );
  return service.listPortfolio();
}
