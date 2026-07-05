import { NextResponse } from 'next/server'

export interface ApiSuccessResponse<T> {
  success: true
  data: T
  message?: string
  timestamp: string
}

export interface ApiErrorResponse {
  success: false
  error: string
  errors?: unknown
  timestamp: string
}

export function createApiResponse<T>(
  data: T,
  message?: string,
  status = 200
): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json(
    {
      success: true as const,
      data,
      ...(message ? { message } : {}),
      timestamp: new Date().toISOString(),
    },
    { status }
  )
}

export function createApiError(
  error: string,
  status = 500,
  errors?: unknown
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      success: false as const,
      error,
      ...(errors !== undefined ? { errors } : {}),
      timestamp: new Date().toISOString(),
    },
    { status }
  )
}

export interface ImportResultData {
  totalRecords?: number
  successCount?: number
  errorCount?: number
  errors?: unknown[]
  [key: string]: unknown
}

export function createImportResponse(
  data: ImportResultData,
  message?: string,
  status = 200
): NextResponse<ApiSuccessResponse<ImportResultData>> {
  return createApiResponse(data, message, status)
}

export function createImportError(
  error: string,
  status = 500,
  errors?: unknown[]
): NextResponse<ApiErrorResponse> {
  return createApiError(error, status, errors)
}

export function validateRequiredFields(
  body: Record<string, unknown>,
  fields: string[]
): string | null {
  for (const field of fields) {
    const value = body[field]
    if (value === undefined || value === null || value === '') {
      return `${field} is required`
    }
  }
  return null
}
