'use server';

import { container } from '@/lib/inversify.config';
import { SYMBOL } from '@/types/symbol';
import { IWbsTagApplicationService } from '@/applications/wbs/wbs-tag-application-service';
import { revalidatePath } from 'next/cache';

export async function getWbsTags(wbsId: number) {
    const tagService = container.get<IWbsTagApplicationService>(SYMBOL.IWbsTagApplicationService);
    return await tagService.getTagsByWbsId(wbsId);
}

export async function getAllTagNames() {
    const tagService = container.get<IWbsTagApplicationService>(SYMBOL.IWbsTagApplicationService);
    return await tagService.getAllTagNames();
}

export async function addWbsTag(wbsId: number, name: string) {
    const tagService = container.get<IWbsTagApplicationService>(SYMBOL.IWbsTagApplicationService);
    const result = await tagService.addTag(wbsId, name);
    revalidatePath(`/wbs/${wbsId}`);
    return result;
}

export async function removeWbsTag(wbsId: number, name: string) {
    const tagService = container.get<IWbsTagApplicationService>(SYMBOL.IWbsTagApplicationService);
    await tagService.removeTag(wbsId, name);
    revalidatePath(`/wbs/${wbsId}`);
}
