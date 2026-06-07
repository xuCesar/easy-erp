import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthPrincipal } from '../../../core/auth/auth.types';
import { PermissionService } from '../../../core/permission';
import type { EmployeeRepository } from '../../employee';
import { calculateAttendanceResult } from '../calculator/attendance-calculator';
import type { AttendanceCalculationInput } from '../calculator/attendance-calculator.types';
import type {
  AttendanceResultDisplayStatus,
  AttendanceResultListQuery,
  AttendanceResultRecord,
  AttendanceResultRow,
  AttendanceResultRepository,
} from './attendance-result.repository';

export type AttendanceResultQuery = {
  factoryId?: string;
  employeeId?: string;
  orgUnitId?: string | null;
  startDate?: string;
  endDate?: string;
  primaryStatus?: AttendanceResultDisplayStatus;
  page: number;
  pageSize: number;
};

export type AttendanceResultPage = {
  items: AttendanceResultResponseRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type AttendanceResultResponseRow = Omit<
  AttendanceResultRow,
  'clockInAt' | 'clockOutAt'
> & {
  clockInAt: string | null;
  clockOutAt: string | null;
};

@Injectable()
export class AttendanceResultService {
  constructor(
    private readonly repository: AttendanceResultRepository,
    private readonly permissionService?: PermissionService,
    private readonly employeeRepository?: Pick<EmployeeRepository, 'findById'>,
  ) {}

  async list(
    principal: AuthPrincipal,
    query: AttendanceResultQuery,
  ): Promise<AttendanceResultPage> {
    assertDateQuery(query.startDate, query.endDate);
    assertDisplayStatus(query.primaryStatus);

    const scopedQuery = await this.resolveScopedQuery(principal, query);
    const result = await this.repository.list(scopedQuery);

    return {
      items: result.items.map(toResponseRow),
      total: result.total,
      page: scopedQuery.page,
      pageSize: scopedQuery.pageSize,
      totalPages: Math.ceil(result.total / scopedQuery.pageSize),
    };
  }

  async recalculate(
    input: AttendanceCalculationInput,
  ): Promise<AttendanceResultRecord> {
    const existing = await this.repository.findByEmployeeAndDate(
      input.tenantId,
      input.employeeId,
      input.date,
    );

    if (existing?.isFinalized) {
      throw new ConflictException('Attendance result is finalized.');
    }

    return this.repository.upsert(calculateAttendanceResult(input));
  }

  private async resolveScopedQuery(
    principal: AuthPrincipal,
    query: AttendanceResultQuery,
  ): Promise<AttendanceResultListQuery> {
    const startDate = query.startDate;
    const endDate = query.endDate;

    if (!isDateOnly(startDate) || !isDateOnly(endDate)) {
      throw new BadRequestException('startDate and endDate are required as YYYY-MM-DD.');
    }

    const employeeScopedId = employeeScopeId(principal);

    if (employeeScopedId) {
      if (query.employeeId && query.employeeId !== employeeScopedId) {
        throw new ForbiddenException('Permission denied for target employee.');
      }

      const employee = await this.findEmployee(principal.tenantId, employeeScopedId);

      return {
        tenantId: principal.tenantId,
        factoryId: employee.factoryId,
        employeeId: employee.id,
        orgUnitId: null,
        startDate,
        endDate,
        primaryStatus: query.primaryStatus,
        page: query.page,
        pageSize: query.pageSize,
      };
    }

    if (!this.permissionService) {
      throw new ForbiddenException('Permission service is required.');
    }

    if (query.employeeId) {
      const employee = await this.findEmployee(principal.tenantId, query.employeeId);

      if (
        !this.permissionService.canAccessResource(principal, {
          tenantId: principal.tenantId,
          factoryId: employee.factoryId,
          orgUnitId: employee.orgUnitId,
          employeeId: employee.id,
        })
      ) {
        throw new ForbiddenException('Permission denied for target employee.');
      }

      return {
        tenantId: principal.tenantId,
        factoryId: query.factoryId ?? employee.factoryId,
        employeeId: employee.id,
        orgUnitId: null,
        startDate,
        endDate,
        primaryStatus: query.primaryStatus,
        page: query.page,
        pageSize: query.pageSize,
      };
    }

    if (!query.factoryId) {
      throw new BadRequestException('factoryId is required for non-employee query.');
    }

    if (
      !this.permissionService.canAccessResource(principal, {
        tenantId: principal.tenantId,
        factoryId: query.factoryId,
        orgUnitId: query.orgUnitId ?? null,
      })
    ) {
      throw new ForbiddenException('Permission denied for target scope.');
    }

    return {
      tenantId: principal.tenantId,
      factoryId: query.factoryId,
      employeeId: undefined,
      orgUnitId: query.orgUnitId ?? null,
      startDate,
      endDate,
      primaryStatus: query.primaryStatus,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  private async findEmployee(
    tenantId: string,
    employeeId: string,
  ): Promise<NonNullable<Awaited<ReturnType<EmployeeRepository['findById']>>>> {
    if (!this.employeeRepository) {
      throw new ForbiddenException('Employee repository is required.');
    }

    const employee = await this.employeeRepository.findById(tenantId, employeeId);

    if (!employee) {
      throw new NotFoundException('Employee not found.');
    }

    return employee;
  }
}

function assertDateQuery(
  startDate: string | undefined,
  endDate: string | undefined,
): asserts startDate is string {
  if (!isDateOnly(startDate) || !isDateOnly(endDate)) {
    throw new BadRequestException('startDate and endDate are required as YYYY-MM-DD.');
  }

  if (startDate > endDate) {
    throw new BadRequestException('startDate must be before or equal to endDate.');
  }
}

function isDateOnly(value: string | undefined): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function assertDisplayStatus(
  value: AttendanceResultDisplayStatus | undefined,
): void {
  if (
    value &&
    ![
      'NORMAL',
      'LATE',
      'EARLY_LEAVE',
      'ABSENT',
      'LEAVE',
      'MISSING_CLOCK',
    ].includes(value)
  ) {
    throw new BadRequestException('Invalid primaryStatus.');
  }
}

function employeeScopeId(principal: AuthPrincipal): string | null {
  const employeeScope = principal.dataScopes.find((scope) => scope.type === 'EMPLOYEE');

  return employeeScope?.type === 'EMPLOYEE'
    ? employeeScope.employeeId
    : null;
}

function toResponseRow(row: AttendanceResultRow): AttendanceResultResponseRow {
  return {
    ...row,
    clockInAt: row.clockInAt?.toISOString() ?? null,
    clockOutAt: row.clockOutAt?.toISOString() ?? null,
  };
}
