"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { container } from "@/lib/inversify.config";
import { SYMBOL } from "@/types/symbol";
import { IImportJobApplicationService } from "@/applications/import-job/import-job-application-service";
import type { IWbsApplicationService } from "@/applications/wbs/wbs-application-service";
import type { ImportJobType, ImportJobDto } from "@/types/import-job";
import type { ActionResult } from "@/types/action-result";

function getImportJobService(): IImportJobApplicationService {
  return container.get<IImportJobApplicationService>(
    SYMBOL.IImportJobApplicationService
  );
}

type ImportJobEntity = Awaited<
  ReturnType<IImportJobApplicationService["getAllJobs"]>
>[number];

function formatJob(
  job: ImportJobEntity,
  wbsMap: Map<number, string>
): ImportJobDto {
  return {
    id: job.id,
    type: job.type,
    status: job.status,
    progress: job.progress,
    totalRecords: job.totalRecords,
    processedRecords: job.processedRecords,
    successCount: job.successCount,
    errorCount: job.errorCount,
    createdAt: job.createdAt.toISOString(),
    startedAt: job.startedAt?.toISOString(),
    completedAt: job.completedAt?.toISOString(),
    targetMonth: job.targetMonth,
    wbsId: job.wbsId,
    wbsName:
      job.type === "WBS"
        ? job.wbsId
          ? wbsMap.get(job.wbsId) ?? null
          : null
        : job.targetProjectIds && job.targetProjectIds.length > 0
          ? job.targetProjectIds.join(",")
          : null,
    errorDetails: job.errorDetails,
    result: job.result,
  };
}

export async function getImportJobs(): Promise<ImportJobDto[]> {
  const importJobService = getImportJobService();
  const jobs = await importJobService.getAllJobs();

  const wbsService = container.get<IWbsApplicationService>(
    SYMBOL.IWbsApplicationService
  );
  const wbsIdSet = new Set<number>();
  for (const job of jobs) {
    if (job.type === "WBS" && job.wbsId) {
      wbsIdSet.add(job.wbsId);
    }
  }
  const wbsMap = new Map<number, string>();
  const wbsIdList = Array.from(wbsIdSet);
  if (wbsIdList.length > 0) {
    const results = await Promise.all(
      wbsIdList.map(async (id) => {
        const wbs = await wbsService.getWbsById(id);
        return [id, wbs?.name ?? ""] as const;
      })
    );
    for (const [id, name] of results) {
      wbsMap.set(id, name);
    }
  }

  return jobs.map((job) => formatJob(job, wbsMap));
}

type CreateImportJobInput = {
  type: ImportJobType;
  wbsId?: number;
  targetProjectIds?: string[];
  targetMonth?: string;
  options?: Record<string, unknown>;
};

export async function createImportJob(
  input: CreateImportJobInput
): Promise<ActionResult<{ id: string }>> {
  const parsed = z
    .object({ type: z.enum(["WBS", "GEPPO"]) })
    .safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "インポート種別が不正です。" };
  }

  const importJobService = getImportJobService();
  const job = await importJobService.createJob({
    ...input,
    createdBy: undefined,
  } as unknown as Parameters<IImportJobApplicationService["createJob"]>[0]);

  revalidatePath("/import-jobs");
  return { success: true, data: { id: job.id } };
}

export async function executeImportJob(
  id: string
): Promise<ActionResult<void>> {
  const importJobService = getImportJobService();

  const job = await importJobService.getJob(id);
  if (!job) {
    return { success: false, error: "ジョブが見つかりません" };
  }
  if (job.status !== "PENDING") {
    return { success: false, error: "ジョブは保留中ではありません" };
  }

  await importJobService.startJob(id);
  importJobService.executeJobAsync(id);

  revalidatePath("/import-jobs");
  return { success: true, data: undefined };
}

export async function cancelImportJob(
  id: string
): Promise<ActionResult<void>> {
  const importJobService = getImportJobService();
  await importJobService.cancelJob(id);

  revalidatePath("/import-jobs");
  return { success: true, data: undefined };
}
