import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreateEmployeeInput,
  EmployeeListQuery,
  EmployeeRecord,
  EmployeeRepository,
  UpdateEmployeeInput,
} from './employee.repository';
import type { OrganizationRepository, OrgUnitRecord } from '../organization';

export type EmployeePage = {
  items: EmployeeRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

@Injectable()
export class EmployeeService {
  constructor(
    private readonly employeeRepository: EmployeeRepository,
    private readonly organizationRepository: Pick<
      OrganizationRepository,
      'findById' | 'listByFactory'
    >,
  ) {}

  async list(tenantId: string, query: EmployeeListQuery): Promise<EmployeePage> {
    const expandedQuery = query.orgUnitId
      ? {
          ...query,
          descendantOrgUnitIds: await this.resolveDescendantOrgUnitIds(
            tenantId,
            query.factoryId,
            query.orgUnitId,
          ),
        }
      : query;
    const result = await this.employeeRepository.list(tenantId, expandedQuery);

    return {
      ...result,
      page: query.page,
      pageSize: query.pageSize,
      totalPages: Math.ceil(result.total / query.pageSize),
    };
  }

  async create(input: CreateEmployeeInput): Promise<EmployeeRecord> {
    await this.assertEmpNoAvailable(input.tenantId, input.empNo);
    await this.assertOrgUnitInSameFactory(
      input.tenantId,
      input.factoryId,
      input.orgUnitId,
    );

    return this.employeeRepository.create(input);
  }

  async update(
    tenantId: string,
    id: string,
    input: UpdateEmployeeInput,
  ): Promise<EmployeeRecord> {
    const current = await this.employeeRepository.findById(tenantId, id);

    if (!current) {
      throw new NotFoundException('Employee not found.');
    }

    if (input.empNo && input.empNo !== current.empNo) {
      await this.assertEmpNoAvailable(tenantId, input.empNo);
    }

    await this.assertOrgUnitInSameFactory(
      tenantId,
      input.factoryId ?? current.factoryId,
      input.orgUnitId === undefined ? current.orgUnitId : input.orgUnitId,
    );

    return this.employeeRepository.update(tenantId, id, input);
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const current = await this.employeeRepository.findById(tenantId, id);

    if (!current) {
      throw new NotFoundException('Employee not found.');
    }

    await this.employeeRepository.softDelete(tenantId, id);
  }

  private async assertEmpNoAvailable(
    tenantId: string,
    empNo: string,
  ): Promise<void> {
    const existing = await this.employeeRepository.findByEmpNo(tenantId, empNo);

    if (existing) {
      throw new ConflictException('Employee number already exists.');
    }
  }

  private async assertOrgUnitInSameFactory(
    tenantId: string,
    factoryId: string,
    orgUnitId: string | null,
  ): Promise<void> {
    if (!orgUnitId) {
      return;
    }

    const orgUnit = await this.organizationRepository.findById(tenantId, orgUnitId);

    if (!orgUnit || orgUnit.factoryId !== factoryId) {
      throw new NotFoundException('Organization unit not found.');
    }
  }

  private async resolveDescendantOrgUnitIds(
    tenantId: string,
    factoryId: string,
    orgUnitId: string,
  ): Promise<string[]> {
    const units = await this.organizationRepository.listByFactory(
      tenantId,
      factoryId,
    );

    if (!units.some((unit) => unit.id === orgUnitId)) {
      throw new NotFoundException('Organization unit not found.');
    }

    return collectDescendantIds(units, orgUnitId);
  }
}

function collectDescendantIds(units: OrgUnitRecord[], rootId: string): string[] {
  const childrenByParent = new Map<string, OrgUnitRecord[]>();

  for (const unit of units) {
    if (!unit.parentId) {
      continue;
    }

    childrenByParent.set(unit.parentId, [
      ...(childrenByParent.get(unit.parentId) ?? []),
      unit,
    ]);
  }

  const result: string[] = [];
  const stack = [...(childrenByParent.get(rootId) ?? [])];

  while (stack.length > 0) {
    const current = stack.pop();

    if (!current) {
      continue;
    }

    result.push(current.id);
    stack.push(...(childrenByParent.get(current.id) ?? []));
  }

  return result;
}
