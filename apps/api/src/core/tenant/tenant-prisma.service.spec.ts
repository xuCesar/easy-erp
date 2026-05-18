import { describe, expect, it, vi } from 'vitest';
import { runWithTenantContext } from './tenant-context';
import { TenantPrismaService } from './tenant-prisma.service';

type TransactionClient = {
  $executeRaw: ReturnType<typeof vi.fn>;
};

describe('TenantPrismaService', () => {
  it('rejects tenant transaction when context is missing', async () => {
    const service = new TenantPrismaService();

    await expect(service.runInTenantTransaction(() => undefined)).rejects.toThrow(
      'Tenant context is not available.',
    );
  });

  it('sets the tenant id before executing transaction work', async () => {
    const tx: TransactionClient = {
      $executeRaw: vi.fn().mockResolvedValue(0),
    };
    const transaction = vi
      .fn()
      .mockImplementation(async (callback: (client: TransactionClient) => unknown) =>
        callback(tx),
      );
    const service = new TenantPrismaService({
      $transaction: transaction,
    });

    const result = await runWithTenantContext(
      {
        tenantId: '9f532d62-4f0d-4a4f-b6f7-e2e3d870a61f',
        userId: 'user-a',
        factoryIds: ['factory-a'],
      },
      () => service.runInTenantTransaction(() => 'ok'),
    );

    expect(result).toBe('ok');
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
  });
});
