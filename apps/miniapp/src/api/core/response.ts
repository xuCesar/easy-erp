import type { ApiResponse, ApiSuccessResponse } from '@easy-erp/shared-types';

export interface OperationFeedback {
  type: 'success' | 'error' | 'permission-denied' | 'network-retry';
  message: string;
  requestId?: string;
}

export class ApiResponseError extends Error {
  readonly code: number;
  readonly requestId: string;

  constructor(response: Exclude<ApiResponse<unknown>, ApiSuccessResponse<unknown>>) {
    super(response.message);
    this.name = 'ApiResponseError';
    this.code = response.code;
    this.requestId = response.requestId;
  }
}

export async function requestData<TData>(request: Promise<ApiResponse<TData>>): Promise<TData> {
  const response = await request;

  if (response.code === 0) {
    return (response as ApiSuccessResponse<TData>).data;
  }

  throw new ApiResponseError(
    response as Exclude<ApiResponse<unknown>, ApiSuccessResponse<unknown>>,
  );
}

export async function withNetworkRetry<TData>(
  operation: () => Promise<TData>,
  attempts = 2,
): Promise<TData> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (error instanceof ApiResponseError || attempt === attempts) {
        throw error;
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error('网络异常，请稍后重试。');
}

export function toOperationFeedback(error: unknown): OperationFeedback {
  if (error instanceof ApiResponseError && error.code >= 40301 && error.code <= 40399) {
    return {
      type: 'permission-denied',
      message: '当前账号没有权限访问该数据，请重新登录或联系管理员。',
      requestId: error.requestId,
    };
  }

  if (error instanceof ApiResponseError) {
    return { type: 'error', message: error.message, requestId: error.requestId };
  }

  if (error instanceof Error) {
    return { type: 'network-retry', message: error.message };
  }

  return { type: 'error', message: '操作失败，请稍后重试。' };
}

export type MiniappFeedback = OperationFeedback;
export const MiniappApiError = ApiResponseError;
export const toMiniappFeedback = toOperationFeedback;
