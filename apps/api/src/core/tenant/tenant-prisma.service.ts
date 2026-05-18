import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { getTenantContext } from './tenant-context';

type TransactionClient = {
  $executeRaw: (query: TemplateStringsArray, ...values: unknown[]) => Promise<unknown>;
};

type PrismaTransactionHost = {
  $transaction: <T>(
    callback: (client: TransactionClient) => Promise<T> | T,
  ) => Promise<T>;
};

@Injectable()
export class TenantPrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly prisma: PrismaTransactionHost;
  private readonly lifecycleClient?: PrismaClient;

  constructor(prisma?: PrismaTransactionHost) {
    if (prisma) {
      this.prisma = prisma;
      return;
    }

    const client = new PrismaClient();
    this.prisma = client;
    this.lifecycleClient = client;
  }

  async onModuleInit(): Promise<void> {
    await this.lifecycleClient?.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.lifecycleClient?.$disconnect();
  }

  async runInTenantTransaction<T>(
    callback: (client: TransactionClient) => Promise<T> | T,
  ): Promise<T> {
    const { tenantId } = getTenantContext();

    return this.prisma.$transaction(async (client) => {
      await client.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;

      return callback(client);
    });
  }
}
