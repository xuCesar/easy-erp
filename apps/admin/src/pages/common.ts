import type {
  ApiClient,
  ApiResponse,
  ApiSuccessResponse,
  MonthlyReportQuery,
  PaginatedData,
} from '@easy-erp/shared-types';

export interface AdminDashboardScope extends MonthlyReportQuery {}

export interface AdminFeedback {
  type: 'success' | 'error' | 'permission-denied';
  message: string;
  requestId?: string;
}

export class ApiContractError extends Error {
  readonly code: number;
  readonly requestId: string;

  constructor(response: Exclude<ApiResponse<unknown>, ApiSuccessResponse<unknown>>) {
    super(response.message);
    this.name = 'ApiContractError';
    this.code = response.code;
    this.requestId = response.requestId;
  }
}

export async function requestData<TData>(request: Promise<ApiResponse<TData>>): Promise<TData> {
  const response = await request;

  if (response.code === 0) {
    return (response as ApiSuccessResponse<TData>).data;
  }

  throw new ApiContractError(response as Exclude<ApiResponse<unknown>, ApiSuccessResponse<unknown>>);
}

export function emptyPage<TItem>(page = 1, pageSize = 20): PaginatedData<TItem> {
  return {
    items: [],
    total: 0,
    page,
    pageSize,
    totalPages: 0,
  };
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

export function toAdminFeedback(error: unknown): AdminFeedback {
  if (error instanceof ApiContractError && error.code >= 40301 && error.code <= 40399) {
    return {
      type: 'permission-denied',
      message: '当前账号没有权限执行该操作，请联系管理员确认数据范围或角色权限。',
      requestId: error.requestId,
    };
  }

  if (error instanceof Error) {
    return { type: 'error', message: error.message };
  }

  return { type: 'error', message: '操作失败，请稍后重试。' };
}

export function createAdminResourceContext(client: ApiClient, scope: AdminDashboardScope) {
  return { client, scope };
}
