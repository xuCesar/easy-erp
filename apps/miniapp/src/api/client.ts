import Taro from '@tarojs/taro';
import type {
  ApiClient,
  ApiRequestOptions,
  ApiResponse,
  LoginResponse,
} from '@easy-erp/shared-types';
import { STORAGE_KEYS } from '../shared/constants/app';
import { getErrorMessage } from '../shared/utils/error';

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
      'Content-Type': 'application/json; charset=utf-8',
      ...options?.headers,
    };

    if (session) {
      header.Authorization = `Bearer ${session.accessToken}`;
    }

    const requestOptions = {
      url: `${this.baseUrl}${path}`,
      method,
      data: body,
      header,
      dataType: 'json' as const,
      timeout: 15000,
    };

    let response;

    try {
      response = await Taro.request<ApiResponse<TData>>(requestOptions);
    } catch (error) {
      throw new Error(getErrorMessage(error, '网络请求失败，请检查网络或接口地址。'));
    }

    if (!response || typeof response.statusCode !== 'number' || response.statusCode >= 400) {
      throw new Error(`请求失败：${response?.statusCode ?? '未知状态码'}`);
    }

    if (response.data == null) {
      throw new Error('接口返回数据为空，请检查服务端响应。');
    }

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
  Taro.setStorageSync(STORAGE_KEYS.session, session);
}

export function loadSession(): MiniappSession | null {
  const session = Taro.getStorageSync<MiniappSession | ''>(STORAGE_KEYS.session);
  return session && typeof session.accessToken === 'string' ? session : null;
}

export function isSessionActive(session: MiniappSession | null): session is MiniappSession {
  return Boolean(session && Number.isFinite(session.expiresAt) && session.expiresAt > Date.now());
}

export function clearSession(): void {
  Taro.removeStorageSync(STORAGE_KEYS.session);
}
