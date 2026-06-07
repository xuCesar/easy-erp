export enum AppErrorType {
  NETWORK = 'NETWORK',
  UNAUTHORIZED = 'UNAUTHORIZED',
  VALIDATION = 'VALIDATION',
  SERVER = 'SERVER',
  BUSINESS = 'BUSINESS',
  UNKNOWN = 'UNKNOWN',
}

export interface AppErrorOptions {
  type?: AppErrorType;
  code?: string | number;
  statusCode?: number;
  details?: unknown;
  requestId?: string;
  userMessage?: string;
}

export class AppError extends Error {
  readonly type: AppErrorType;
  readonly code?: string | number;
  readonly statusCode?: number;
  readonly details?: unknown;
  readonly requestId?: string;
  readonly userMessage: string;

  constructor(message: string, options: AppErrorOptions = {}) {
    super(message);
    this.name = 'AppError';
    this.type = options.type ?? inferErrorType(options);
    this.code = options.code;
    this.statusCode = options.statusCode;
    this.details = options.details;
    this.requestId = options.requestId;
    this.userMessage = options.userMessage ?? getUserMessage(this.type, message);
  }
}

export class RequestError extends AppError {
  constructor(message: string, options: AppErrorOptions = {}) {
    super(message, options);
    this.name = 'RequestError';
  }
}

export function inferErrorType(options: Pick<AppErrorOptions, 'code' | 'statusCode'>): AppErrorType {
  if (options.statusCode === 401 || options.code === 40101 || options.code === '40101') {
    return AppErrorType.UNAUTHORIZED;
  }

  if (options.statusCode === 400 || options.statusCode === 422) {
    return AppErrorType.VALIDATION;
  }

  if (options.statusCode && options.statusCode >= 500) {
    return AppErrorType.SERVER;
  }

  return AppErrorType.BUSINESS;
}

export function getUserMessage(type: AppErrorType, fallback = '请求失败，请稍后重试。'): string {
  const messages: Record<AppErrorType, string> = {
    [AppErrorType.NETWORK]: '网络连接异常，请检查网络后重试。',
    [AppErrorType.UNAUTHORIZED]: '登录状态已失效，请重新登录。',
    [AppErrorType.VALIDATION]: fallback,
    [AppErrorType.SERVER]: '服务暂时不可用，请稍后重试。',
    [AppErrorType.BUSINESS]: fallback,
    [AppErrorType.UNKNOWN]: fallback,
  };

  return messages[type];
}

export function normalizeError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    return new AppError(error.message || '请求失败，请稍后重试。', {
      type: AppErrorType.UNKNOWN,
      details: error,
    });
  }

  return new AppError(getErrorMessage(error, '请求失败，请稍后重试。'), {
    type: AppErrorType.UNKNOWN,
    details: error,
  });
}

export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof AppError) {
    return error.userMessage;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

export function getUserErrorMessage(error: unknown): string {
  return normalizeError(error).userMessage;
}

export function isUnauthorizedError(error: unknown): boolean {
  return normalizeError(error).type === AppErrorType.UNAUTHORIZED;
}
