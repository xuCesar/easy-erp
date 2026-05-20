import { createMiniappPages } from './pages';
import { TaroApiClient, loadSession } from './api/client';
import { createTaroRuntime } from './runtime';

declare const TARO_APP_API_BASE_URL: string;

export function createRuntimePages() {
  const client = new TaroApiClient(TARO_APP_API_BASE_URL, loadSession);
  return createMiniappPages(client, createTaroRuntime());
}
