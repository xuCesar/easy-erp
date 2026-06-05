declare const TARO_APP_API_BASE_URL: string;

const FALLBACK_API_BASE_URL = 'http://192.168.3.236:3000';

function normalizeBaseUrl(value: string | undefined): string {
  return (value ?? '').replace(/\/+$/, '');
}

export const appConfig = {
  apiBaseUrl: normalizeBaseUrl(
    typeof TARO_APP_API_BASE_URL === 'string' && TARO_APP_API_BASE_URL
      ? TARO_APP_API_BASE_URL
      : FALLBACK_API_BASE_URL,
  ),
};

export function buildApiUrl(path: string): string {
  if (/^https?:\/\//.test(path)) {
    return path;
  }

  return `${appConfig.apiBaseUrl}${path.startsWith('/') ? path : `/${path}`}`;
}
