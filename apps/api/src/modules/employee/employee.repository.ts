import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { EmployeeStatus, PrismaClient } from '@prisma/client';

export type EmployeeRecord = {
  id: string;
  tenantId: string;
  factoryId: string;
  orgUnitId: string | null;
  empNo: string;
  name: string;
  phone: string | null;
  entryDate: Date;
  status: EmployeeStatus;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export type EmployeeListQuery = {
  factoryId: string;
  orgUnitId?: string | null;
  descendantOrgUnitIds?: string[];
  status?: EmployeeStatus;
  keyword?: string | null;
  page: number;
  pageSize: number;
};

export type CreateEmployeeInput = {
  tenantId: string;
  factoryId: string;
  orgUnitId: string | null;
  empNo: string;
  name: string;
  phone: string | null;
  entryDate: Date;
  status: EmployeeStatus;
};

export type UpdateEmployeeInput = Partial<{
  factoryId: string;
  orgUnitId: string | null;
  empNo: string;
  name: string;
  phone: string | null;
  entryDate: Date;
  status: EmployeeStatus;
}>;

export interface EmployeeRepository {
  list(
    tenantId: string,
    query: EmployeeListQuery,
  ): Promise<{ items: EmployeeRecord[]; total: number }>;
  findById(tenantId: string, id: string): Promise<EmployeeRecord | null>;
  findByEmpNo(tenantId: string, empNo: string): Promise<EmployeeRecord | null>;
  create(input: CreateEmployeeInput): Promise<EmployeeRecord>;
  update(
    tenantId: string,
    id: string,
    input: UpdateEmployeeInput,
  ): Promise<EmployeeRecord>;
  softDelete(tenantId: string, id: string): Promise<void>;
}

@Injectable()
export class PrismaEmployeeRepository
  implements EmployeeRepository, OnModuleInit, OnModuleDestroy
{
  private readonly prisma = new PrismaClient();

  async onModuleInit(): Promise<void> {
    await this.prisma.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.prisma.$disconnect();
  }

  async list(
    tenantId: string,
    query: EmployeeListQuery,
  ): Promise<{ items: EmployeeRecord[]; total: number }> {
    const where = {
      tenantId,
      factoryId: query.factoryId,
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.orgUnitId
        ? {
            orgUnitId: {
              in: [query.orgUnitId, ...(query.descendantOrgUnitIds ?? [])],
            },
          }
        : {}),
      ...(query.keyword
        ? {
            OR: [
              {
                name: {
                  contains: query.keyword,
                  mode: 'insensitive' as const,
                },
              },
              {
                empNo: {
                  contains: query.keyword,
                  mode: 'insensitive' as const,
                },
              },
              {
                phone: {
                  contains: query.keyword,
                  mode: 'insensitive' as const,
                },
              },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.employee.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.employee.count({
        where,
      }),
    ]);

    return { items, total };
  }

  async findById(tenantId: string, id: string): Promise<EmployeeRecord | null> {
    return this.prisma.employee.findFirst({
      where: {
        tenantId,
        id,
        deletedAt: null,
      },
    });
  }

  async findByEmpNo(
    tenantId: string,
    empNo: string,
  ): Promise<EmployeeRecord | null> {
    return this.prisma.employee.findFirst({
      where: {
        tenantId,
        empNo,
        deletedAt: null,
      },
    });
  }

  async create(input: CreateEmployeeInput): Promise<EmployeeRecord> {
    return this.prisma.employee.create({
      data: {
        tenantId: input.tenantId,
        factoryId: input.factoryId,
        orgUnitId: input.orgUnitId,
        empNo: input.empNo,
        name: input.name,
        phone: input.phone,
        entryDate: input.entryDate,
        status: input.status,
      },
    });
  }

  async update(
    tenantId: string,
    id: string,
    input: UpdateEmployeeInput,
  ): Promise<EmployeeRecord> {
    await this.assertExists(tenantId, id);

    return this.prisma.employee.update({
      where: {
        id,
      },
      data: input,
    });
  }

  async softDelete(tenantId: string, id: string): Promise<void> {
    await this.assertExists(tenantId, id);
    await this.prisma.employee.update({
      where: {
        id,
      },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  private async assertExists(tenantId: string, id: string): Promise<void> {
    const count = await this.prisma.employee.count({
      where: {
        tenantId,
        id,
        deletedAt: null,
      },
    });

    if (count === 0) {
      throw new Error('Employee not found.');
    }
  }
}
