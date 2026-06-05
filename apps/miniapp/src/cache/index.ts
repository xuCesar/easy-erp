import Taro from '@tarojs/taro';
import type { CheckinResult } from '@easy-erp/shared-types';
import type { MiniappSession } from '../api/core/session';

export interface CacheSchema {
  session: MiniappSession | null;
  lastCheckinResult: CheckinResult | null;
}

const cacheKeys: Record<keyof CacheSchema, string> = {
  session: 'easy-erp-miniapp-session',
  lastCheckinResult: 'easy-erp-miniapp-last-checkin-result',
};

const defaults: CacheSchema = {
  session: null,
  lastCheckinResult: null,
};

class TypedCache {
  get<K extends keyof CacheSchema>(key: K): CacheSchema[K] {
    const value = Taro.getStorageSync<CacheSchema[K] | ''>(cacheKeys[key]);
    return value === '' || value === undefined || value === null ? defaults[key] : value;
  }

  set<K extends keyof CacheSchema>(key: K, value: CacheSchema[K]): void {
    Taro.setStorageSync(cacheKeys[key], value);
  }

  remove<K extends keyof CacheSchema>(key: K): void {
    Taro.removeStorageSync(cacheKeys[key]);
  }

  reset(): void {
    Object.keys(cacheKeys).forEach((key) => {
      this.remove(key as keyof CacheSchema);
    });
  }
}

export const cache = new TypedCache();
