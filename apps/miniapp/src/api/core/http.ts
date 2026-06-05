import Taro from '@tarojs/taro';
import type { ApiClient, ApiRequestOptions, ApiResponse, ApiSuccessResponse } from '@easy-erp/shared-types';
import { buildApiUrl } from '../../config/app';
import { toastError } from '../../feedback';
import { redirectToLogin } from '../../router/auth';
import { AppErrorType, RequestError, isUnauthorizedError } from './errors';
import { clearSession, loadSession, type MiniappSession } from './session';

export interface RequestOptions extends Partial<Taro.request.Option<unknown>> {
  skipAuth?: boolean;
  showErrorToast?: boolean;
  headers?: Record<string, string>;
}

function getRequestHost(requestUrl: string): string {
  return requestUrl.match(/^https?:\/\/([^/]+)/)?.[1] ?? requestUrl;
}

function getNetworkErrorMessage(errMsg: string | undefined, requestUrl: string): string {
  const message = errMsg ?? '';
  const host = getRequestHost(requestUrl);

  if (message.includes('url not in domain list') || message.includes('合法域名')) {
    return `请求域名未配置：${host}。请在微信开发者工具开启“不校验合法域名”，或将该域名加入 request 合法域名。`;
  }

  if (message.includes('ERR_CONNECTION_REFUSED') || message.includes('connection refused')) {
    return `接口服务不可访问：${host}。请确认 API 服务已启动，并且小程序可访问该地址。`;
  }

  if (message.includes('timeout')) {
    return `接口请求超时：${host}。请检查网络、API 服务状态或接口地址配置。`;
  }

  return message || '网络请求失败，请检查网络或接口地址。';
}

export async function request<TData>(url: string, options: RequestOptions = {}): Promise<TData> {
  const requestUrl = buildApiUrl(url);
  const session = options.skipAuth ? null : loadSession();
  const header: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json; charset=utf-8',
    ...options.headers,
    ...(options.header as Record<string, string> | undefined),
  };

  if (!options.skipAuth && session) {
    header.Authorization = `Bearer ${session.accessToken}`;
  }

  return new Promise<TData>((resolve, reject) => {
    Taro.request<ApiResponse<TData>>({
      url: requestUrl,
      method: options.method ?? 'GET',
      data: options.data,
      timeout: options.timeout ?? 15000,
      header,
      dataType: 'json',
      success: (response) => {
        const payload = response.data;

        if (response.statusCode >= 200 && response.statusCode < 300 && payload?.code === 0) {
          resolve((payload as ApiSuccessResponse<TData>).data);
          return;
        }

        reject(new RequestError(payload?.message || '请求失败，请稍后重试。', {
          code: payload?.code,
          statusCode: response.statusCode,
          details: {
            payload,
            url: requestUrl,
          },
          requestId: payload?.requestId,
        }));
      },
      fail: (error) => {
        const message = getNetworkErrorMessage(error.errMsg, requestUrl);

        reject(new RequestError(message, {
          type: AppErrorType.NETWORK,
          details: {
            error,
            url: requestUrl,
          },
          userMessage: message,
        }));
      },
    });
  }).catch((error: unknown) => {
    if (isUnauthorizedError(error)) {
      clearSession();
      void redirectToLogin();
    }

    if (options.showErrorToast) {
      void toastError(error);
    }

    throw error;
  });
}

export class TaroApiClient implements ApiClient {
  constructor(private readonly getSession: () => MiniappSession | null = loadSession) {}

  get<TData>(path: string, options?: ApiRequestOptions): Promise<ApiResponse<TData>> {
    return this.requestRaw<TData>('GET', path, undefined, options);
  }

  post<TData, TBody = unknown>(
    path: string,
    body?: TBody,
    options?: ApiRequestOptions,
  ): Promise<ApiResponse<TData>> {
    return this.requestRaw<TData>('POST', path, body, options);
  }

  patch<TData, TBody = unknown>(
    path: string,
    body?: TBody,
    options?: ApiRequestOptions,
  ): Promise<ApiResponse<TData>> {
    return this.requestRaw<TData>('PATCH', path, body, options);
  }

  delete<TData>(path: string, options?: ApiRequestOptions): Promise<ApiResponse<TData>> {
    return this.requestRaw<TData>('DELETE', path, undefined, options);
  }

  private async requestRaw<TData>(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    path: string,
    body?: unknown,
    options?: ApiRequestOptions,
  ): Promise<ApiResponse<TData>> {
    const data = await request<TData>(path, {
      method,
      data: body,
      headers: options?.headers,
    });

    return {
      code: 0,
      message: 'success',
      data,
      requestId: '',
    };
  }
}
