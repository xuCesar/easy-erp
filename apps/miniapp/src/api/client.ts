import Taro from '@tarojs/taro';
import type {
  ApiClient,
  ApiRequestOptions,
  ApiResponse,
  LoginResponse,
} from '@easy-erp/shared-types';

const sessionKey = 'easy-erp-miniapp-session';

export interface MiniappSession {
  accessToken: string;
  refreshToken: string;
  tenantId: string;
  employeeId: string | null;
  roles: string[];
  expiresAt: number;
}

export class TaroApiClient implements ApiClient {
  constructor(
    private readonly baseUrl: string,
    private readonly getSession: () => MiniappSession | null,
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
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    path: string,
    body?: unknown,
    options?: ApiRequestOptions,
  ): Promise<ApiResponse<TData>> {
    const session = this.getSession();
    const header: Record<string, string> = {
      Accept: 'application/json',
      ...options?.headers,
    };

    if (session) {
      header.Authorization = `Bearer ${session.accessToken}`;
    }

    const response = await Taro.request<ApiResponse<TData>>({
      url: `${this.baseUrl}${path}`,
      method,
      data: body,
      header,
    });

    return response.data;
  }
}

export function createSession(response: LoginResponse): MiniappSession {
  return {
    accessToken: response.accessToken,
    refreshToken: response.refreshToken,
    tenantId: response.user.tenantId,
    employeeId: response.user.employeeId,
    roles: response.user.roles,
    expiresAt: Date.now() + response.expiresIn * 1000,
  };
}

export function saveSession(session: MiniappSession): void {
  Taro.setStorageSync(sessionKey, session);
}

export function loadSession(): MiniappSession | null {
  const session = Taro.getStorageSync<MiniappSession | ''>(sessionKey);
  return session && typeof session.accessToken === 'string' ? session : null;
}

export function clearSession(): void {
  Taro.removeStorageSync(sessionKey);
}
