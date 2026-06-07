import type {
  ApiClient,
  ApiRequestOptions,
  ApiResponse,
} from '@easy-erp/shared-types';

export interface AdminSession {
  accessToken: string;
  refreshToken: string;
  tenantId: string;
  roles: string[];
  expiresAt: number;
}

export class FetchApiClient implements ApiClient {
  constructor(
    private readonly baseUrl: string,
    private readonly getSession: () => AdminSession | null,
  ) {}

  get<TData>(path: string, options?: ApiRequestOptions): Promise<ApiResponse<TData>> {
    return this.request<TData>('GET', path, undefined, options);
  }

  post<TData, TBody = unknown>(
    path: string,
    body?: TBody,
    options?: ApiRequestOptions,
  ): Promise<ApiResponse<TData>> {
    return this.request<TData>('POST', path, body, options);
  }

  patch<TData, TBody = unknown>(
    path: string,
    body?: TBody,
    options?: ApiRequestOptions,
  ): Promise<ApiResponse<TData>> {
    return this.request<TData>('PATCH', path, body, options);
  }

  delete<TData>(path: string, options?: ApiRequestOptions): Promise<ApiResponse<TData>> {
    return this.request<TData>('DELETE', path, undefined, options);
  }

  private async request<TData>(
    method: string,
    path: string,
    body?: unknown,
    options?: ApiRequestOptions,
  ): Promise<ApiResponse<TData>> {
    const session = this.getSession();
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...options?.headers,
    };

    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    if (session) {
      headers.Authorization = `Bearer ${session.accessToken}`;
    }

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const payload = (await response.json().catch(() => null)) as ApiResponse<TData> | unknown | null;

      if (payload && typeof payload === 'object' && 'code' in payload) {
        return payload as ApiResponse<TData>;
      }

      return {
        code: response.ok ? 0 : response.status,
        message: response.ok ? 'success' : toHttpErrorMessage(response.status, path, payload),
        data: (response.ok ? payload : null) as TData,
        requestId: createRequestId(),
      } as ApiResponse<TData>;
    } catch (error) {
      return {
        code: 50001,
        message: error instanceof Error ? error.message : '网络请求失败。',
        data: null,
        requestId: createRequestId(),
      };
    }
  }
}

export function saveSession(session: AdminSession): void {
  localStorage.setItem('easy-erp-admin-session', JSON.stringify(session));
}

export function loadSession(): AdminSession | null {
  const raw = localStorage.getItem('easy-erp-admin-session');

  if (!raw) {
    return null;
  }

  try {
    const session = JSON.parse(raw) as AdminSession;
    return typeof session.accessToken === 'string' ? session : null;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  localStorage.removeItem('easy-erp-admin-session');
}

function createRequestId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

function toHttpErrorMessage(status: number, path: string, payload: unknown): string {
  if (path.endsWith('/auth/login')) {
    if (status === 400) {
      return '请输入手机号和密码。';
    }

    if (status === 401) {
      return '手机号或密码不正确。';
    }

    if (status === 403) {
      return '当前账号已停用，请联系管理员。';
    }
  }

  if (status === 401) {
    return '登录状态已失效，请重新登录。';
  }

  const serverMessage = readServerMessage(payload);
  return serverMessage || `请求失败，状态码 ${status}。`;
}

function readServerMessage(payload: unknown): string {
  if (!payload || typeof payload !== 'object' || !('message' in payload)) {
    return '';
  }

  const message = (payload as { message: unknown }).message;

  if (typeof message === 'string') {
    return message;
  }

  if (Array.isArray(message) && message.every((item) => typeof item === 'string')) {
    return message.join('；');
  }

  return '';
}
