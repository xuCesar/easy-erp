import Taro from '@tarojs/taro';
import type { RuntimeAdapter } from '../shared/runtime/types';

export function createTaroRuntime(): RuntimeAdapter {
  const system = Taro.getSystemInfoSync();
  const deviceId = `${system.brand ?? 'unknown'}:${system.model}`;

  return {
    now: () => new Date().toISOString(),
    idempotencyKey: (action) => `${deviceId}:${Date.now()}:${action}`,
    deviceId,
  };
}
