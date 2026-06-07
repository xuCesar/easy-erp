import { createMiniappPages } from './pages';
import { TaroApiClient, loadSession } from './api/client';
import { createTaroRuntime } from './runtime';

export function createRuntimePages() {
  const client = new TaroApiClient('', loadSession);
  return createMiniappPages(client, createTaroRuntime());
}
