import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { AccountStatus, PrismaClient } from '@prisma/client';
import type { DataScope, RoleName } from '../permission';

export type AccountAuthRecord = {
  id: string;
  tenantId: string;
  employeeId: string | null;
  phone: string;
  passwordHash: string;
  status: 'ACTIVE' | 'DISABLED';
  roles: RoleName[];
  dataScopes: DataScope[];
};

export type AccountListRecord = {
  id: string;
  tenantId: string;
  employeeId: string | null;
  employeeName: string | null;
  phone: string;
  status: 'ACTIVE' | 'DISABLED';
  lastLoginAt: Date | null;
  createdAt: Date;
  roles: RoleName[];
  dataScopes: DataScope[];
};

export type AccountListQuery = {
  keyword?: string | null;
  status?: 'ACTIVE' | 'DISABLED';
  page: number;
  pageSize: number;
};

export type CreateAccountInput = {
  tenantId: string;
  phone: string;
  passwordHash: string;
  employeeId: string | null;
  roles: RoleName[];
  status: 'ACTIVE' | 'DISABLED';
};

export type UpdateAccountInput = Partial<{
  phone: string;
  passwordHash: string;
  employeeId: string | null;
  roles: RoleName[];
  status: 'ACTIVE' | 'DISABLED';
}>;

export interface AccountRepository {
  findCandidatesByPhone(phone: string): Promise<AccountAuthRecord[]>;
  findById(accountId: string): Promise<AccountAuthRecord | null>;
  markLastLogin(accountId: string, loggedInAt: Date): Promise<void>;
  list(
    tenantId: string,
    query: AccountListQuery,
  ): Promise<{ items: AccountListRecord[]; total: number }>;
  create(input: CreateAccountInput): Promise<AccountListRecord>;
  update(
    tenantId: string,
    accountId: string,
    input: UpdateAccountInput,
  ): Promise<AccountListRecord>;
}

type AccountRoleRow = {
  roleName: RoleName;
};

type AccountDataScopeRow = {
  scopeType: 'TENANT' | 'FACTORY' | 'ORG_UNIT' | 'EMPLOYEE';
  factoryId: string | null;
  orgUnitId: string | null;
  employeeId: string | null;
};

type AccountWithAuthRows = {
  id: string;
  tenantId: string;
  employeeId: string | null;
  phone: string;
  passwordHash: string;
  status: AccountStatus;
  roles: AccountRoleRow[];
  dataScopes: AccountDataScopeRow[];
};

type AccountWithListRows = AccountWithAuthRows & {
  lastLoginAt: Date | null;
  createdAt: Date;
  employee: {
    name: string;
  } | null;
};

@Injectable()
export class PrismaAccountRepository
  implements AccountRepository, OnModuleInit, OnModuleDestroy
{
  private readonly prisma = new PrismaClient();

  async onModuleInit(): Promise<void> {
    await this.prisma.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.prisma.$disconnect();
  }

  async findCandidatesByPhone(phone: string): Promise<AccountAuthRecord[]> {
    const accounts = await this.prisma.accountUser.findMany({
      where: {
        phone,
        deletedAt: null,
      },
      include: {
        roles: true,
        dataScopes: true,
      },
    });

    return accounts.map((account) =>
      this.toAuthRecord(account as AccountWithAuthRows),
    );
  }

  async findById(accountId: string): Promise<AccountAuthRecord | null> {
    const account = await this.prisma.accountUser.findFirst({
      where: {
        id: accountId,
        deletedAt: null,
      },
      include: {
        roles: true,
        dataScopes: true,
      },
    });

    return account ? this.toAuthRecord(account as AccountWithAuthRows) : null;
  }

  async markLastLogin(accountId: string, loggedInAt: Date): Promise<void> {
    await this.prisma.accountUser.update({
      where: {
        id: accountId,
      },
      data: {
        lastLoginAt: loggedInAt,
      },
    });
  }

  async list(
    tenantId: string,
    query: AccountListQuery,
  ): Promise<{ items: AccountListRecord[]; total: number }> {
    const where = {
      tenantId,
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.keyword
        ? {
            OR: [
              { phone: { contains: query.keyword, mode: 'insensitive' as const } },
              {
                employee: {
                  name: { contains: query.keyword, mode: 'insensitive' as const },
                },
              },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.accountUser.findMany({
        where,
        include: {
          employee: {
            select: {
              name: true,
            },
          },
          roles: true,
          dataScopes: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.accountUser.count({ where }),
    ]);

    return {
      items: items.map((account) =>
        this.toListRecord(account as AccountWithListRows),
      ),
      total,
    };
  }

  async create(input: CreateAccountInput): Promise<AccountListRecord> {
    const account = await this.prisma.accountUser.create({
      data: {
        tenantId: input.tenantId,
        phone: input.phone,
        passwordHash: input.passwordHash,
        employeeId: input.employeeId,
        status: input.status,
        roles: {
          create: input.roles.map((roleName) => ({
            tenantId: input.tenantId,
            roleName,
          })),
        },
      },
      include: {
        employee: {
          select: {
            name: true,
          },
        },
        roles: true,
        dataScopes: true,
      },
    });

    return this.toListRecord(account as AccountWithListRows);
  }

  async update(
    tenantId: string,
    accountId: string,
    input: UpdateAccountInput,
  ): Promise<AccountListRecord> {
    const account = await this.prisma.$transaction(async (tx) => {
      await tx.accountUser.update({
        where: {
          id: accountId,
        },
        data: {
          ...(input.phone !== undefined ? { phone: input.phone } : {}),
          ...(input.passwordHash !== undefined
            ? { passwordHash: input.passwordHash }
            : {}),
          ...(input.employeeId !== undefined ? { employeeId: input.employeeId } : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
        },
      });

      if (input.roles) {
        await tx.accountRole.deleteMany({
          where: {
            tenantId,
            accountUserId: accountId,
          },
        });
        await tx.accountRole.createMany({
          data: input.roles.map((roleName) => ({
            tenantId,
            accountUserId: accountId,
            roleName,
          })),
          skipDuplicates: true,
        });
      }

      return tx.accountUser.findFirstOrThrow({
        where: {
          tenantId,
          id: accountId,
          deletedAt: null,
        },
        include: {
          employee: {
            select: {
              name: true,
            },
          },
          roles: true,
          dataScopes: true,
        },
      });
    });

    return this.toListRecord(account as AccountWithListRows);
  }

  private toAuthRecord(account: AccountWithAuthRows): AccountAuthRecord {
    return {
      id: account.id,
      tenantId: account.tenantId,
      employeeId: account.employeeId,
      phone: account.phone,
      passwordHash: account.passwordHash,
      status: account.status,
      roles: account.roles.map((role) => role.roleName),
      dataScopes: account.dataScopes.map((scope) => this.toDataScope(scope)),
    };
  }

  private toListRecord(account: AccountWithListRows): AccountListRecord {
    return {
      id: account.id,
      tenantId: account.tenantId,
      employeeId: account.employeeId,
      phone: account.phone,
      status: account.status,
      roles: account.roles.map((role) => role.roleName),
      dataScopes: account.dataScopes.map((scope) => this.toDataScope(scope)),
      employeeName: account.employee?.name ?? null,
      lastLoginAt: account.lastLoginAt,
      createdAt: account.createdAt,
    };
  }

  private toDataScope(scope: AccountDataScopeRow): DataScope {
    switch (scope.scopeType) {
      case 'TENANT':
        return { type: 'TENANT' };
      case 'FACTORY':
        if (!scope.factoryId) {
          throw new Error('Factory data scope is missing factoryId.');
        }
        return { type: 'FACTORY', factoryId: scope.factoryId };
      case 'ORG_UNIT':
        if (!scope.orgUnitId) {
          throw new Error('Org unit data scope is missing orgUnitId.');
        }
        return { type: 'ORG_UNIT', orgUnitId: scope.orgUnitId };
      case 'EMPLOYEE':
        if (!scope.employeeId) {
          throw new Error('Employee data scope is missing employeeId.');
        }
        return { type: 'EMPLOYEE', employeeId: scope.employeeId };
    }
  }
}
