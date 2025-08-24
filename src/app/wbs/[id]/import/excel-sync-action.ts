"use server";

import { container } from "@/lib/inversify.config";
import { IWbsSyncApplicationService } from "@/applications/excel-sync/IWbsSyncApplicationService";
import { SYMBOL } from "@/types/symbol";

export async function executeWbsSync(wbsId: number, mode: 'sync' | 'replace' = 'sync') {
    try {
        // WBSからプロジェクトIDを取得
        const wbs = await prisma.wbs.findUnique({
            where: { id: wbsId },
            include: { project: true },
        });

        if (!wbs) {
            throw new Error('WBSが見つかりません');
        }

        const syncService = container.get<IWbsSyncApplicationService>(
            SYMBOL.IWbsSyncApplicationService
        );

        const result = mode === 'replace'
            ? await syncService.executeReplaceAll(wbsId)
            : await syncService.executeSync(wbsId);

        return {
            success: result.success,
            data: result,
        };
    } catch (error) {
        console.error('同期エラー:', error);
        throw new Error(error instanceof Error ? error.message : '同期処理中にエラーが発生しました');
    }
}

export async function getWbsSyncPreview(wbsId: number) {
    try {
        // WBSからプロジェクトIDを取得
        const wbs = await prisma.wbs.findUnique({
            where: { id: wbsId },
            include: { project: true },
        });

        if (!wbs) {
            throw new Error('WBSが見つかりません');
        }

        // 同期サービスを取得
        const syncService = container.get<IWbsSyncApplicationService>(
            SYMBOL.IWbsSyncApplicationService
        );

        // 同期プレビュー
        const preview = await syncService.previewSync(wbs.id);
        return {
            success: true,
            data: preview,
        };
    } catch (error) {
        console.error('同期プレビューエラー:', error);
        throw new Error(error instanceof Error ? error.message : '同期プレビューの取得中にエラーが発生しました');
    }
}

export async function getWbsSyncHistory(wbsId: number, limit?: number) {
    try {
        // WBSからプロジェクトIDを取得
        const wbs = await prisma.wbs.findUnique({
            where: { id: wbsId },
            include: { project: true },
        });

        if (!wbs) {
            throw new Error('WBSが見つかりません');
        }

        const project = await prisma.projects.findUnique({
            where: { id: wbs.projectId },
            select: {
                name: true,
            },
        });

        // 同期サービスを取得
        const syncService = container.get<IWbsSyncApplicationService>(
            SYMBOL.IWbsSyncApplicationService
        );

        // 同期履歴
        const history = await syncService.getSyncHistory(
            project!.name,
            limit
        );
        return {
            success: true,
            data: history,
        };
    } catch (error) {
        console.error('同期履歴取得エラー:', error);
        throw new Error(error instanceof Error ? error.message : '同期履歴の取得中にエラーが発生しました');
    }
}

export async function getWbsLastSync(wbsId: number) {
    try {
        // WBSからプロジェクトIDを取得
        const wbs = await prisma.wbs.findUnique({
            where: { id: wbsId },
            include: { project: true },
        });

        if (!wbs) {
            throw new Error('WBSが見つかりません');
        }

        // 同期サービスを取得
        const syncService = container.get<IWbsSyncApplicationService>(
            SYMBOL.IWbsSyncApplicationService
        );

        // 最終同期情報
        const lastSync = await syncService.getLastSync(wbs.projectId);
        return {
            success: true,
            data: lastSync,
        };
    } catch (error) {
        console.error('最終同期情報取得エラー:', error);
        throw new Error(error instanceof Error ? error.message : '最終同期情報の取得中にエラーが発生しました');
    }
}