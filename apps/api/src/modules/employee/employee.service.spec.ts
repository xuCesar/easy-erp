import { ConflictException, NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { EmployeeService } from './employee.service';
import type {
  CreateEmployeeInput,
  EmployeeListQuery,
  EmployeeRecord,
  EmployeeRepository,
  UpdateEmployeeInput,
} from './employee.repository';
import type { OrganizationRepository, OrgUnitRecord } from '../organization/organization.repository';

class FakeEmployeeRepository implements EmployeeRepository {
  private readonly employees = new Map<string, EmployeeRecord>();

  constructor(records: EmployeeRecord[] = []) {
    for (const record of records) {
      this.employees.set(record.id, record);
    }
  }

  async list(
    tenantId: string,
    query: EmployeeListQuery,
  ): Promise<{ items: EmployeeRecord[]; total: number }> {
    const items = [...this.employees.values()].filter(
      (employee) =>
        employee.tenantId === tenantId &&
        employee.factoryId === query.factoryId &&
        (!query.orgUnitId ||
          [query.orgUnitId, ...(query.descendantOrgUnitIds ?? [])].includes(
            employee.orgUnitId ?? '',
          )) &&
        employee.deletedAt === null,
    );

    return {
      items,
      total: items.length,
    };
  }

  async findById(tenantId: string, id: string): Promise<EmployeeRecord | null> {
    const employee = this.employees.get(id);

    return employee && employee.tenantId === tenantId && employee.deletedAt === null
      ? employee
      : null;
  }

  async findByEmpNo(
    tenantId: string,
    empNo: string,
  ): Promise<EmployeeRecord | null> {
    return (
      [...this.employees.values()].find(
        (employee) =>
          employee.tenantId === tenantId &&
          employee.empNo === empNo &&
          employee.deletedAt === null,
      ) ?? null
    );
  }

  async create(input: CreateEmployeeInput): Promise<EmployeeRecord> {
    const record: EmployeeRecord = {
      id: `employee-${this.employees.size + 1}`,
      tenantId: input.tenantId,
      factoryId: input.factoryId,
      orgUnitId: input.orgUnitId,
      empNo: input.empNo,
      name: input.name,
      phone: input.phone ?? null,
      entryDate: input.entryDate,
      status: input.status,
      createdAt: new Date('2026-05-18T00:00:00.000Z'),
      updatedAt: new Date('2026-05-18T00:00:00.000Z'),
      deletedAt: null,
    };
    this.employees.set(record.id, record);

    return record;
  }

  async update(
    tenantId: string,
    id: string,
    input: UpdateEmployeeInput,
  ): Promise<EmployeeRecord> {
    const current = await this.findById(tenantId, id);

    if (!current) {
      throw new NotFoundException('Employee not found.');
    }

    const next = {
      ...current,
      ...input,
      updatedAt: new Date('2026-05-19T00:00:00.000Z'),
    };
    this.employees.set(id, next);

    return next;
  }

  async softDelete(tenantId: string, id: string): Promise<void> {
    const current = await this.findById(tenantId, id);

    if (!current) {
      throw new NotFoundException('Employee not found.');
    }

    this.employees.set(id, {
      ...current,
      deletedAt: new Date('2026-05-20T00:00:00.000Z'),
    });
  }
}

class FakeOrganizationRepository
  implements Pick<OrganizationRepository, 'findById' | 'listByFactory'>
{
  constructor(private readonly orgUnits: OrgUnitRecord[] = []) {}

  async listByFactory(tenantId: string, factoryId: string): Promise<OrgUnitRecord[]> {
    return this.orgUnits.filter(
      (unit) =>
        unit.tenantId === tenantId &&
        unit.factoryId === factoryId &&
        unit.deletedAt === null,
    );
  }

  async findById(tenantId: string, id: string): Promise<OrgUnitRecord | null> {
    return (
      this.orgUnits.find(
        (unit) => unit.tenantId === tenantId && unit.id === id && unit.deletedAt === null,
      ) ?? null
    );
  }
}

describe('EmployeeService', () => {
  it('lists employees under organization unit and descendant units', async () => {
    const service = new EmployeeService(
      new FakeEmployeeRepository([
        employee({ id: 'employee-parent', orgUnitId: 'org-parent' }),
        employee({ id: 'employee-child', orgUnitId: 'org-child' }),
        employee({ id: 'employee-other', orgUnitId: 'org-other' }),
      ]),
      new FakeOrganizationRepository([
        orgUnit({ id: 'org-parent', parentId: null }),
        orgUnit({ id: 'org-child', parentId: 'org-parent' }),
        orgUnit({ id: 'org-other', parentId: null }),
      ]),
    );

    const result = await service.list('tenant-1', {
      factoryId: 'factory-1',
      orgUnitId: 'org-parent',
      page: 1,
      pageSize: 20,
    });

    expect(result.items.map((item) => item.id).sort()).toEqual([
      'employee-child',
      'employee-parent',
    ]);
  });

  it('creates employee under an organization unit in the same factory', async () => {
    const service = new EmployeeService(
      new FakeEmployeeRepository(),
      new FakeOrganizationRepository([
        orgUnit({ id: 'org-1', tenantId: 'tenant-1', factoryId: 'factory-1' }),
      ]),
    );

    const employee = await service.create({
      tenantId: 'tenant-1',
      factoryId: 'factory-1',
      orgUnitId: 'org-1',
      empNo: 'E001',
      name: '张三',
      phone: '13800000000',
      entryDate: new Date('2026-05-18T00:00:00.000Z'),
      status: 'ACTIVE',
    });

    expect(employee).toMatchObject({
      factoryId: 'factory-1',
      orgUnitId: 'org-1',
      empNo: 'E001',
      name: '张三',
    });
  });

  it('creates employee directly under factory when orgUnitId is null', async () => {
    const service = new EmployeeService(
      new FakeEmployeeRepository(),
      new FakeOrganizationRepository(),
    );

    const employee = await service.create({
      tenantId: 'tenant-1',
      factoryId: 'factory-1',
      orgUnitId: null,
      empNo: 'E002',
      name: '李四',
      phone: null,
      entryDate: new Date('2026-05-18T00:00:00.000Z'),
      status: 'ACTIVE',
    });

    expect(employee.orgUnitId).toBeNull();
  });

  it('rejects duplicate employee number in the same tenant', async () => {
    const service = new EmployeeService(
      new FakeEmployeeRepository([employee({ empNo: 'E001' })]),
      new FakeOrganizationRepository(),
    );

    await expect(
      service.create({
        tenantId: 'tenant-1',
        factoryId: 'factory-1',
        orgUnitId: null,
        empNo: 'E001',
        name: '王五',
        phone: null,
        entryDate: new Date('2026-05-18T00:00:00.000Z'),
        status: 'ACTIVE',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects organization unit from another factory', async () => {
    const service = new EmployeeService(
      new FakeEmployeeRepository(),
      new FakeOrganizationRepository([
        orgUnit({ id: 'org-2', tenantId: 'tenant-1', factoryId: 'factory-2' }),
      ]),
    );

    await expect(
      service.create({
        tenantId: 'tenant-1',
        factoryId: 'factory-1',
        orgUnitId: 'org-2',
        empNo: 'E003',
        name: '赵六',
        phone: null,
        entryDate: new Date('2026-05-18T00:00:00.000Z'),
        status: 'ACTIVE',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

function employee(overrides: Partial<EmployeeRecord>): EmployeeRecord {
  return {
    id: 'employee-1',
    tenantId: 'tenant-1',
    factoryId: 'factory-1',
    orgUnitId: null,
    empNo: 'E001',
    name: '员工',
    phone: null,
    entryDate: new Date('2026-05-18T00:00:00.000Z'),
    status: 'ACTIVE',
    createdAt: new Date('2026-05-18T00:00:00.000Z'),
    updatedAt: new Date('2026-05-18T00:00:00.000Z'),
    deletedAt: null,
    ...overrides,
  };
}

function orgUnit(overrides: Partial<OrgUnitRecord>): OrgUnitRecord {
  return {
    id: 'org-1',
    tenantId: 'tenant-1',
    factoryId: 'factory-1',
    parentId: null,
    name: '组织',
    type: 'GROUP',
    sortOrder: 0,
    status: 'ACTIVE',
    createdAt: new Date('2026-05-18T00:00:00.000Z'),
    updatedAt: new Date('2026-05-18T00:00:00.000Z'),
    deletedAt: null,
    ...overrides,
  };
}
