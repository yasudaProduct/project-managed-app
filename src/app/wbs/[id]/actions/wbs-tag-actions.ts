'use server';

import { z } from 'zod';
import { container } from '@/lib/inversify.config';
import { SYMBOL } from '@/types/symbol';
import { IWbsTagApplicationService } from '@/applications/wbs/wbs-tag-application-service';
import { revalidatePath } from 'next/cache';
import type { ActionResult } from '@/types/action-result';

export async function getWbsTags(wbsId: number) {
    const tagService = container.get<IWbsTagApplicationService>(SYMBOL.IWbsTagApplicationService);
    return await tagService.getTagsByWbsId(wbsId);
}

export async function getAllTagNames() {
    const tagService = container.get<IWbsTagApplicationService>(SYMBOL.IWbsTagApplicationService);
    return await tagService.getAllTagNames();
}

const tagNameSchema = z.string().min(1, 'タグ名を入力してください。');

export async function addWbsTag(
    wbsId: number,
    name: string
): Promise<ActionResult<{ id: number; name: string }>> {
    const parsed = tagNameSchema.safeParse(name);
    if (!parsed.success) {
        return { success: false, error: '入力値が不正です。' };
    }

    const tagService = container.get<IWbsTagApplicationService>(SYMBOL.IWbsTagApplicationService);
    const tag = await tagService.addTag(wbsId, parsed.data);
    revalidatePath(`/wbs/${wbsId}`);
    return { success: true, data: tag };
}

export async function removeWbsTag(wbsId: number, name: string): Promise<ActionResult<void>> {
    const parsed = tagNameSchema.safeParse(name);
    if (!parsed.success) {
        return { success: false, error: '入力値が不正です。' };
    }

    const tagService = container.get<IWbsTagApplicationService>(SYMBOL.IWbsTagApplicationService);
    await tagService.removeTag(wbsId, parsed.data);
    revalidatePath(`/wbs/${wbsId}`);
    return { success: true, data: undefined };
}
