import { NextResponse } from 'next/server'

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  errors?: string[]
  message?: string
  timestamp: string
}

export interface ImportApiResponse {
  success: boolean
  data?: {
    successCount: number
    createdCount: number
    updatedCount: number
    errorCount: number
    errors: Array<{
      recordId?: string
      message: string
      details?: unknown
    }>
    executionTime?: number
  }
  error?: string
  message?: string
  timestamp: string
}

export function createApiResponse<T>(
  data: T,
  message?: string,
  status = 200
): NextResponse<ApiResponse<T>> {
  return NextResponse.json({
    success: true,
    data,
    message,
    timestamp: new Date().toISOString()
  }, { status })
}

export function createApiError(
  error: string,
  status = 400,
  errors?: string[]
): NextResponse<ApiResponse> {
  return NextResponse.json({
    success: false,
    error,
    errors,
    timestamp: new Date().toISOString()
  }, { status })
}

export function createImportResponse(
  data: ImportApiResponse['data'],
  message?: string,
  status = 200
): NextResponse<ImportApiResponse> {
  return NextResponse.json({
    success: true,
    data,
    message,
    timestamp: new Date().toISOString()
  }, { status })
}

export function createImportError(
  error: string,
  status = 400
): NextResponse<ImportApiResponse> {
  return NextResponse.json({
    success: false,
    error,
    timestamp: new Date().toISOString()
  }, { status })
}

// リクエストボディのバリデーション用ヘルパー
export function validateRequiredFields(
  body: Record<string, unknown>,
  requiredFields: string[]
): string[] {
  const errors: string[] = []
  
  for (const field of requiredFields) {
    if (!body[field]) {
      errors.push(`${field} is required`)
    }
  }
  
  return errors
}


