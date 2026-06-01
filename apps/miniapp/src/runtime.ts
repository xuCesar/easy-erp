import Taro from '@tarojs/taro';
import type { MiniappRuntime } from './shared/runtime/types';

export function createTaroRuntime(): MiniappRuntime {
  const system = Taro.getSystemInfoSync();
  const deviceId = `${system.brand ?? 'unknown'}:${system.model}`;

  return {
    now: () => new Date().toISOString(),
    idempotencyKey: (action) => `${deviceId}:${Date.now()}:${action}`,
    deviceId,
  };
}
