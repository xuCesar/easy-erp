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

export interface AccountRepository {
  findCandidatesByPhone(phone: string): Promise<AccountAuthRecord[]>;
  findById(accountId: string): Promise<AccountAuthRecord | null>;
  markLastLogin(accountId: string, loggedInAt: Date): Promise<void>;
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
