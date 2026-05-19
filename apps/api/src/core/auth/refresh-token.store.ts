import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

export type RefreshTokenRecord = {
  tokenId: string;
  tenantId: string;
  accountUserId: string;
  expiresAt: Date;
};

export interface RefreshTokenStore {
  save(record: RefreshTokenRecord): Promise<void>;
  revoke(tokenId: string): Promise<void>;
  isRevoked(tokenId: string): Promise<boolean>;
}

@Injectable()
export class InMemoryRefreshTokenStore implements RefreshTokenStore {
  private readonly tokens = new Map<
    string,
    RefreshTokenRecord & { revokedAt: Date | null }
  >();

  async save(record: RefreshTokenRecord): Promise<void> {
    this.tokens.set(record.tokenId, {
      ...record,
      revokedAt: null,
    });
  }

  async revoke(tokenId: string): Promise<void> {
    const record = this.tokens.get(tokenId);

    if (record) {
      this.tokens.set(tokenId, {
        ...record,
        revokedAt: new Date(),
      });
    }
  }

  async isRevoked(tokenId: string): Promise<boolean> {
    const record = this.tokens.get(tokenId);

    return !record || Boolean(record.revokedAt) || record.expiresAt <= new Date();
  }
}

@Injectable()
export class PrismaRefreshTokenStore
  implements RefreshTokenStore, OnModuleInit, OnModuleDestroy
{
  private readonly prisma = new PrismaClient();

  async onModuleInit(): Promise<void> {
    await this.prisma.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.prisma.$disconnect();
  }

  async save(record: RefreshTokenRecord): Promise<void> {
    await this.prisma.accountRefreshToken.create({
      data: {
        id: record.tokenId,
        tenantId: record.tenantId,
        accountUserId: record.accountUserId,
        expiresAt: record.expiresAt,
      },
    });
  }

  async revoke(tokenId: string): Promise<void> {
    await this.prisma.accountRefreshToken.updateMany({
      where: {
        id: tokenId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  async isRevoked(tokenId: string): Promise<boolean> {
    const record = await this.prisma.accountRefreshToken.findUnique({
      where: {
        id: tokenId,
      },
      select: {
        expiresAt: true,
        revokedAt: true,
      },
    });

    return !record || Boolean(record.revokedAt) || record.expiresAt <= new Date();
  }
}
