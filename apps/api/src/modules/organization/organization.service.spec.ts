import { ConflictException, NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { OrganizationService } from './organization.service';
import type {
  CreateOrgUnitInput,
  OrgUnitRecord,
  OrganizationRepository,
  UpdateOrgUnitInput,
} from './organization.repository';

class FakeOrganizationRepository implements OrganizationRepository {
  private readonly orgUnits = new Map<string, OrgUnitRecord>();

  constructor(records: OrgUnitRecord[] = []) {
    for (const record of records) {
      this.orgUnits.set(record.id, record);
    }
  }

  async listByFactory(tenantId: string, factoryId: string): Promise<OrgUnitRecord[]> {
    return [...this.orgUnits.values()].filter(
      (unit) =>
        unit.tenantId === tenantId &&
        unit.factoryId === factoryId &&
        unit.deletedAt === null,
    );
  }

  async findById(tenantId: string, id: string): Promise<OrgUnitRecord | null> {
    const unit = this.orgUnits.get(id);

    return unit && unit.tenantId === tenantId && unit.deletedAt === null
      ? unit
      : null;
  }

  async create(input: CreateOrgUnitInput): Promise<OrgUnitRecord> {
    const record: OrgUnitRecord = {
      id: `org-${this.orgUnits.size + 1}`,
      tenantId: input.tenantId,
      factoryId: input.factoryId,
      parentId: input.parentId,
      name: input.name,
      type: input.type,
      sortOrder: input.sortOrder,
      status: 'ACTIVE',
      createdAt: new Date('2026-05-18T00:00:00.000Z'),
      updatedAt: new Date('2026-05-18T00:00:00.000Z'),
      deletedAt: null,
    };
    this.orgUnits.set(record.id, record);

    return record;
  }

  async update(
    tenantId: string,
    id: string,
    input: UpdateOrgUnitInput,
  ): Promise<OrgUnitRecord> {
    const current = await this.findById(tenantId, id);

    if (!current) {
      throw new NotFoundException('Organization unit not found.');
    }

    const next = {
      ...current,
      ...input,
      updatedAt: new Date('2026-05-19T00:00:00.000Z'),
    };
    this.orgUnits.set(id, next);

    return next;
  }

  async hasChildren(tenantId: string, id: string): Promise<boolean> {
    return [...this.orgUnits.values()].some(
      (unit) =>
        unit.tenantId === tenantId &&
        unit.parentId === id &&
        unit.deletedAt === null,
    );
  }

  async hasActiveEmployees(_tenantId: string, id: string): Promise<boolean> {
    return id === 'org-with-employees';
  }

  async softDelete(tenantId: string, id: string): Promise<void> {
    const current = await this.findById(tenantId, id);

    if (!current) {
      throw new NotFoundException('Organization unit not found.');
    }

    this.orgUnits.set(id, {
      ...current,
      deletedAt: new Date('2026-05-20T00:00:00.000Z'),
    });
  }
}

describe('OrganizationService', () => {
  it('returns flexible organization tree without hard-coded depth', async () => {
    const service = new OrganizationService(
      new FakeOrganizationRepository([
        orgUnit({ id: 'root', parentId: null, sortOrder: 1, name: '工厂直属' }),
        orgUnit({ id: 'child', parentId: 'root', sortOrder: 1, name: '生产组' }),
        orgUnit({ id: 'grandchild', parentId: 'child', sortOrder: 1, name: 'A 班' }),
      ]),
    );

    const tree = await service.listTree({
      tenantId: 'tenant-1',
      factoryId: 'factory-1',
    });

    expect(tree).toEqual([
      expect.objectContaining({
        id: 'root',
        children: [
          expect.objectContaining({
            id: 'child',
            children: [
              expect.objectContaining({
                id: 'grandchild',
                children: [],
              }),
            ],
          }),
        ],
      }),
    ]);
  });

  it('creates child organization only under same tenant and factory', async () => {
    const service = new OrganizationService(
      new FakeOrganizationRepository([
        orgUnit({ id: 'parent', tenantId: 'tenant-1', factoryId: 'factory-1' }),
      ]),
    );

    const created = await service.create({
      tenantId: 'tenant-1',
      factoryId: 'factory-1',
      parentId: 'parent',
      name: '生产二组',
      type: 'GROUP',
      sortOrder: 20,
    });

    expect(created).toMatchObject({
      tenantId: 'tenant-1',
      factoryId: 'factory-1',
      parentId: 'parent',
      name: '生产二组',
    });
  });

  it('rejects deleting organization unit with children or active employees', async () => {
    const service = new OrganizationService(
      new FakeOrganizationRepository([
        orgUnit({ id: 'parent' }),
        orgUnit({ id: 'child', parentId: 'parent' }),
        orgUnit({ id: 'org-with-employees' }),
      ]),
    );

    await expect(
      service.remove({
        tenantId: 'tenant-1',
        id: 'parent',
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    await expect(
      service.remove({
        tenantId: 'tenant-1',
        id: 'org-with-employees',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects moving organization unit under itself or descendants', async () => {
    const service = new OrganizationService(
      new FakeOrganizationRepository([
        orgUnit({ id: 'parent', parentId: null }),
        orgUnit({ id: 'child', parentId: 'parent' }),
      ]),
    );

    await expect(
      service.update('tenant-1', 'parent', {
        parentId: 'parent',
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    await expect(
      service.update('tenant-1', 'parent', {
        parentId: 'child',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

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
