import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/inversify.config';
import { IWbsSyncApplicationService } from '@/applications/sync/IWbsSyncApplicationService';
import { SYMBOL } from '@/types/symbol';
import prisma from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const wbsId = Number(id);

    // WBSからプロジェクトIDを取得
    const wbs = await prisma.wbs.findUnique({
      where: { id: wbsId },
      include: { project: true },
    });

    if (!wbs) {
      return NextResponse.json(
        { error: 'WBSが見つかりません' },
        { status: 404 }
      );
    }

    const syncService = container.get<IWbsSyncApplicationService>(
      SYMBOL.IWbsSyncApplicationService
    );

    const result = await syncService.executeSync(wbs.projectId);

    return NextResponse.json({
      success: result.success,
      data: result,
    });
  } catch (error) {
    console.error('同期エラー:', error);
    return NextResponse.json(
      {
        error: '同期処理中にエラーが発生しました',
        details: error instanceof Error ? error.message : '不明なエラー',
      },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const wbsId = Number(id);
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    // WBSからプロジェクトIDを取得
    const wbs = await prisma.wbs.findUnique({
      where: { id: wbsId },
      include: { project: true },
    });

    if (!wbs) {
      return NextResponse.json(
        { error: 'WBSが見つかりません' },
        { status: 404 }
      );
    }

    // 同期サービスを取得
    const syncService = container.get<IWbsSyncApplicationService>(
      SYMBOL.IWbsSyncApplicationService
    );

    if (action === 'preview') {
      // 同期プレビュー
      const preview = await syncService.previewSync(wbs.id);
      return NextResponse.json({
        success: true,
        data: preview,
      });
    } else if (action === 'history') {
      // 同期履歴
      const limit = searchParams.get('limit');
      const history = await syncService.getSyncHistory(
        wbs.projectId,
        limit ? Number(limit) : undefined
      );
      return NextResponse.json({
        success: true,
        data: history,
      });
    } else if (action === 'last') {
      // 最終同期情報
      const lastSync = await syncService.getLastSync(wbs.projectId);
      return NextResponse.json({
        success: true,
        data: lastSync,
      });
    } else {
      return NextResponse.json(
        { error: '無効なアクションです' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('同期情報取得エラー:', error);
    return NextResponse.json(
      {
        error: '同期情報の取得中にエラーが発生しました',
        details: error instanceof Error ? error.message : '不明なエラー',
      },
      { status: 500 }
    );
  }
}