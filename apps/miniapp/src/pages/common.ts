import type { ApiResponse, ApiSuccessResponse } from '@easy-erp/shared-types';

export interface MiniappRuntime {
  now(): string;
  idempotencyKey(action: string): string;
  deviceId?: string;
}

export interface MiniappFeedback {
  type: 'success' | 'error' | 'permission-denied' | 'network-retry';
  message: string;
  requestId?: string;
}

export class MiniappApiError extends Error {
  readonly code: number;
  readonly requestId: string;

  constructor(response: Exclude<ApiResponse<unknown>, ApiSuccessResponse<unknown>>) {
    super(response.message);
    this.name = 'MiniappApiError';
    this.code = response.code;
    this.requestId = response.requestId;
  }
}

export async function requestData<TData>(request: Promise<ApiResponse<TData>>): Promise<TData> {
  const response = await request;

  if (response.code === 0) {
    return (response as ApiSuccessResponse<TData>).data;
  }

  throw new MiniappApiError(response as Exclude<ApiResponse<unknown>, ApiSuccessResponse<unknown>>);
}

export async function withNetworkRetry<TData>(operation: () => Promise<TData>, attempts = 2): Promise<TData> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (error instanceof MiniappApiError || attempt === attempts) {
        throw error;
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error('网络异常，请稍后重试。');
}

export function toMiniappFeedback(error: unknown): MiniappFeedback {
  if (error instanceof MiniappApiError && error.code >= 40301 && error.code <= 40399) {
    return {
      type: 'permission-denied',
      message: '当前账号没有权限访问该数据，请重新登录或联系管理员。',
      requestId: error.requestId,
    };
  }

  if (error instanceof MiniappApiError) {
    return { type: 'error', message: error.message, requestId: error.requestId };
  }

  if (error instanceof Error) {
    return { type: 'network-retry', message: error.message };
  }

  return { type: 'error', message: '操作失败，请稍后重试。' };
}

export function isoDate(value: string): string {
  return value.slice(0, 10);
}

export function buildQuery(params: Record<string, string | number | boolean | null | undefined>): string {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value));
    }
  });

  const query = search.toString();
  return query ? `?${query}` : '';
}
