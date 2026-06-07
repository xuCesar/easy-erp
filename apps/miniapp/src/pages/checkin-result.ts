import type { CheckinResult } from '@easy-erp/shared-types';

export function createCheckinResultPage(getLastResult: () => CheckinResult | null) {
  return {
    load(): CheckinResult | null {
      return getLastResult();
    },
  };
}
