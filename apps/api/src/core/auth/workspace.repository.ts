import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { EntityStatus, EmployeeStatus, PrismaClient } from '@prisma/client';
import type { DataScope } from '../permission';

export type WorkspaceFactoryRecord = {
  id: string;
  name: string;
  timezone: string;
  status: EntityStatus;
};

export type WorkspaceOrgUnitRecord = {
  id: string;
  factoryId: string;
  parentId: string | null;
  name: string;
  type: 'DEPARTMENT' | 'WORKSHOP' | 'LINE' | 'TEAM' | 'GROUP' | 'CUSTOM';
  sortOrder: number;
  status: EntityStatus;
};

export type WorkspaceEmployeeRecord = {
  id: string;
  factoryId: string;
  orgUnitId: string | null;
  empNo: string;
  name: string;
  phone: string | null;
  entryDate: Date;
  status: EmployeeStatus;
};

@Injectable()
export class WorkspaceRepository implements OnModuleInit, OnModuleDestroy {
  private readonly prisma = new PrismaClient();

  async onModuleInit(): Promise<void> {
    await this.prisma.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.prisma.$disconnect();
  }

  async listFactories(
    tenantId: string,
    scopes: DataScope[],
  ): Promise<WorkspaceFactoryRecord[]> {
    const factoryIds = collectFactoryScopeIds(scopes);
    const employeeIds = collectEmployeeScopeIds(scopes);
    const orgUnitIds = collectOrgUnitScopeIds(scopes);

    const employeeFactories =
      employeeIds.length > 0
        ? await this.prisma.employee.findMany({
            where: {
              tenantId,
              id: {
                in: employeeIds,
              },
              deletedAt: null,
            },
            select: {
              factoryId: true,
            },
          })
        : [];
    const orgUnitFactories =
      orgUnitIds.length > 0
        ? await this.prisma.orgUnit.findMany({
            where: {
              tenantId,
              id: {
                in: orgUnitIds,
              },
              deletedAt: null,
            },
            select: {
              factoryId: true,
            },
          })
        : [];
    const resolvedFactoryIds = [
      ...factoryIds,
      ...employeeFactories.map((item) => item.factoryId),
      ...orgUnitFactories.map((item) => item.factoryId),
    ];

    return this.prisma.factory.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(scopes.some((scope) => scope.type === 'TENANT')
          ? {}
          : {
              id: {
                in: [...new Set(resolvedFactoryIds)],
              },
            }),
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async listOrgUnits(
    tenantId: string,
    factoryIds: string[],
  ): Promise<WorkspaceOrgUnitRecord[]> {
    if (factoryIds.length === 0) {
      return [];
    }

    return this.prisma.orgUnit.findMany({
      where: {
        tenantId,
        factoryId: {
          in: factoryIds,
        },
        deletedAt: null,
      },
      orderBy: [
        {
          sortOrder: 'asc',
        },
        {
          createdAt: 'asc',
        },
      ],
    });
  }

  async findEmployee(
    tenantId: string,
    employeeId: string | null,
  ): Promise<WorkspaceEmployeeRecord | null> {
    if (!employeeId) {
      return null;
    }

    return this.prisma.employee.findFirst({
      where: {
        tenantId,
        id: employeeId,
        deletedAt: null,
      },
    });
  }
}

function collectFactoryScopeIds(scopes: DataScope[]): string[] {
  return scopes.flatMap((scope) =>
    scope.type === 'FACTORY' ? [scope.factoryId] : [],
  );
}

function collectOrgUnitScopeIds(scopes: DataScope[]): string[] {
  return scopes.flatMap((scope) =>
    scope.type === 'ORG_UNIT' ? [scope.orgUnitId] : [],
  );
}

function collectEmployeeScopeIds(scopes: DataScope[]): string[] {
  return scopes.flatMap((scope) =>
    scope.type === 'EMPLOYEE' ? [scope.employeeId] : [],
  );
}
