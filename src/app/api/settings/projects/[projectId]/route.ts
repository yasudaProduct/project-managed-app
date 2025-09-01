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
    const settings = await settingsService.getProjectSettings(params.projectId);
    
    if (!settings) {
      return NextResponse.json({
        dailyWorkingHours: null
      });
    }
    
    return NextResponse.json({
      dailyWorkingHours: settings.getDailyWorkingHours()
    });
  } catch (error) {
    console.error('Failed to get project settings:', error);
    return NextResponse.json(
      { error: 'Failed to get project settings' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const body = await request.json();
    const { dailyWorkingHours } = body;
    
    if (dailyWorkingHours !== null && (typeof dailyWorkingHours !== 'number' || dailyWorkingHours <= 0 || dailyWorkingHours > 24)) {
      return NextResponse.json(
        { error: 'Invalid daily working hours' },
        { status: 400 }
      );
    }
    
    const settingsService = container.get<ISettingsService>(SYMBOL.ISettingsService);
    const updatedSettings = await settingsService.updateProjectSettings(params.projectId, dailyWorkingHours);
    
    return NextResponse.json({
      dailyWorkingHours: updatedSettings.getDailyWorkingHours()
    });
  } catch (error) {
    console.error('Failed to update project settings:', error);
    return NextResponse.json(
      { error: 'Failed to update project settings' },
      { status: 500 }
    );
  }
}