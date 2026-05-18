import { AsyncLocalStorage } from 'node:async_hooks';

export type TenantContext = {
  tenantId: string;
  userId: string;
  factoryIds: string[];
};

const tenantContextStorage = new AsyncLocalStorage<TenantContext>();

export function runWithTenantContext<T>(
  context: TenantContext,
  callback: () => T,
): T {
  return tenantContextStorage.run(context, callback);
}

export function getTenantContext(): TenantContext {
  const context = tenantContextStorage.getStore();

  if (!context) {
    throw new Error('Tenant context is not available.');
  }

  return context;
}

export function getOptionalTenantContext(): TenantContext | undefined {
  return tenantContextStorage.getStore();
}
