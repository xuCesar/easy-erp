import { describe, expect, it, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import type { AuthPrincipal } from '../../core/auth';
import type { EmployeeRecord, EmployeeService } from '../employee';
import { ProfileController } from './profile.controller';
import { ProfileModule } from './profile.module';

describe('ProfileController', () => {
  it('wires module dependencies for auth and permission guards', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ProfileModule],
    }).compile();

    expect(moduleRef.get(ProfileController)).toBeInstanceOf(ProfileController);
    await moduleRef.close();
  });

  it('returns current user with linked employee profile', async () => {
    const service = {
      findById: vi.fn().mockResolvedValue(employeeRecord()),
    } as unknown as EmployeeService;
    const controller = new ProfileController(service);

    const response = await controller.getProfile({
      user: principal({ employeeId: 'employee-1' }),
    });

    expect(service.findById).toHaveBeenCalledWith('tenant-1', 'employee-1');
    expect(response.data.user.employeeId).toBe('employee-1');
    expect(response.data.employee).toMatchObject({
      id: 'employee-1',
      factoryId: 'factory-1',
      name: '张三',
      phone: '',
      entryDate: '2026-05-01',
    });
  });

  it('returns null employee when current account is not linked', async () => {
    const service = {
      findById: vi.fn(),
    } as unknown as EmployeeService;
    const controller = new ProfileController(service);

    const response = await controller.getProfile({
      user: principal({ employeeId: null }),
    });

    expect(service.findById).not.toHaveBeenCalled();
    expect(response.data.employee).toBeNull();
  });
});

function principal(overrides: Partial<AuthPrincipal>): AuthPrincipal {
  return {
    id: 'user-1',
    tenantId: 'tenant-1',
    employeeId: 'employee-1',
    roles: ['EMPLOYEE'],
    dataScopes: [{ type: 'EMPLOYEE', employeeId: 'employee-1' }],
    ...overrides,
  };
}

function employeeRecord(): EmployeeRecord {
  return {
    id: 'employee-1',
    tenantId: 'tenant-1',
    factoryId: 'factory-1',
    orgUnitId: 'org-1',
    empNo: 'E001',
    name: '张三',
    phone: null,
    entryDate: new Date('2026-05-01T00:00:00.000Z'),
    status: 'ACTIVE',
    createdAt: new Date('2026-05-01T00:00:00.000Z'),
    updatedAt: new Date('2026-05-01T00:00:00.000Z'),
    deletedAt: null,
  };
}
