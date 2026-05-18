import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { AuthController } from './auth.controller';
import type { AuthService } from './auth.service';

describe('AuthController', () => {
  it('delegates valid login requests to AuthService', async () => {
    const authService = {
      login: vi.fn().mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 7200,
        user: {
          id: 'user-1',
          tenantId: 'tenant-1',
          employeeId: 'employee-1',
          roles: ['EMPLOYEE'],
        },
      }),
    } as unknown as AuthService;
    const controller = new AuthController(authService);

    const result = await controller.login({
      phone: '13800000000',
      password: 'password123',
    });

    expect(authService.login).toHaveBeenCalledWith({
      phone: '13800000000',
      password: 'password123',
    });
    expect(result.data.accessToken).toBe('access-token');
  });

  it('rejects malformed login requests before calling AuthService', async () => {
    const authService = {
      login: vi.fn(),
    } as unknown as AuthService;
    const controller = new AuthController(authService);

    await expect(
      controller.login({
        phone: '',
        password: '',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(authService.login).not.toHaveBeenCalled();
  });
});
