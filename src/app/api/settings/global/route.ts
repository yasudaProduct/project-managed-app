import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/inversify.config';
import { SYMBOL } from '@/types/symbol';
import type { ISettingsService } from '@/applications/settings/ISettingsService';

export async function GET() {
  try {
    const settingsService = container.get<ISettingsService>(SYMBOL.ISettingsService);
    const settings = await settingsService.getGlobalSettings();
    
    return NextResponse.json({
      dailyWorkingHours: settings.getDailyWorkingHours()
    });
  } catch (error) {
    console.error('Failed to get global settings:', error);
    return NextResponse.json(
      { error: 'Failed to get global settings' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { dailyWorkingHours } = body;
    
    if (typeof dailyWorkingHours !== 'number' || dailyWorkingHours <= 0 || dailyWorkingHours > 24) {
      return NextResponse.json(
        { error: 'Invalid daily working hours' },
        { status: 400 }
      );
    }
    
    const settingsService = container.get<ISettingsService>(SYMBOL.ISettingsService);
    const updatedSettings = await settingsService.updateGlobalSettings(dailyWorkingHours);
    
    return NextResponse.json({
      dailyWorkingHours: updatedSettings.getDailyWorkingHours()
    });
  } catch (error) {
    console.error('Failed to update global settings:', error);
    return NextResponse.json(
      { error: 'Failed to update global settings' },
      { status: 500 }
    );
  }
}