import { createMiniappPages } from './features';
import { TaroApiClient, loadSession } from './api/client';
import { createTaroRuntime } from './runtime';
import { DEFAULT_API_BASE_URL } from './shared/constants/app';

declare const TARO_APP_API_BASE_URL: string;

export function createRuntimePages() {
  const baseUrl = typeof TARO_APP_API_BASE_URL === 'string' && TARO_APP_API_BASE_URL
    ? TARO_APP_API_BASE_URL
    : DEFAULT_API_BASE_URL;

  const client = new TaroApiClient(baseUrl, loadSession);
  return createMiniappPages(client, createTaroRuntime());
}
