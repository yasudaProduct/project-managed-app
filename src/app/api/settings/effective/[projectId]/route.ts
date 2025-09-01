import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/inversify.config';
import { SYMBOL } from '@/types/symbol';
import type { ISettingsService } from '@/applications/settings/ISettingsService';

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const settingsService = container.get<ISettingsService>(SYMBOL.ISettingsService);
    const effectiveSettings = await settingsService.getEffectiveSettings(params.projectId);
    
    return NextResponse.json(effectiveSettings);
  } catch (error) {
    console.error('Failed to get effective settings:', error);
    return NextResponse.json(
      { error: 'Failed to get effective settings' },
      { status: 500 }
    );
  }
}