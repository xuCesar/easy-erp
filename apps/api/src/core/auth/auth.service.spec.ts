import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import { InMemoryRefreshTokenStore } from './refresh-token.store';
import type { AccountAuthRecord, AccountRepository } from '../account/account.repository';

const activeAccount: AccountAuthRecord = {
  id: 'user-1',
  tenantId: 'tenant-1',
  employeeId: 'employee-1',
  phone: '13800000000',
  passwordHash: '',
  status: 'ACTIVE',
  roles: ['EMPLOYEE'],
  dataScopes: [
    {
      type: 'EMPLOYEE',
      employeeId: 'employee-1',
    },
  ],
};

class FakeAccountRepository implements AccountRepository {
  constructor(private readonly accounts: AccountAuthRecord[]) {}

  async findCandidatesByPhone(phone: string): Promise<AccountAuthRecord[]> {
    return this.accounts.filter((account) => account.phone === phone);
  }

  async findById(accountId: string): Promise<AccountAuthRecord | null> {
    return this.accounts.find((account) => account.id === accountId) ?? null;
  }

  async markLastLogin(_accountId: string, _loggedInAt: Date): Promise<void> {}
}

describe('AuthService', () => {
  it('logs in an active account and returns tokens plus principal data', async () => {
    const passwordService = new PasswordService();
    const passwordHash = await passwordService.hashPassword('password123');
    const accountRepository = new FakeAccountRepository([
      {
        ...activeAccount,
        passwordHash,
      },
    ]);
    const service = new AuthService(
      accountRepository,
      passwordService,
      new TokenService({
        accessSecret: 'access-secret',
        refreshSecret: 'refresh-secret',
      }),
      new InMemoryRefreshTokenStore(),
    );

    const result = await service.login({
      phone: '13800000000',
      password: 'password123',
    });

    expect(result.accessToken).toEqual(expect.any(String));
    expect(result.refreshToken).toEqual(expect.any(String));
    expect(result.expiresIn).toBe(7200);
    expect(result.user).toEqual({
      id: 'user-1',
      tenantId: 'tenant-1',
      employeeId: 'employee-1',
      roles: ['EMPLOYEE'],
    });
  });

  it('rejects disabled accounts after password verification succeeds', async () => {
    const passwordService = new PasswordService();
    const passwordHash = await passwordService.hashPassword('password123');
    const accountRepository = new FakeAccountRepository([
      {
        ...activeAccount,
        passwordHash,
        status: 'DISABLED',
      },
    ]);
    const service = new AuthService(
      accountRepository,
      passwordService,
      new TokenService({
        accessSecret: 'access-secret',
        refreshSecret: 'refresh-secret',
      }),
      new InMemoryRefreshTokenStore(),
    );

    await expect(
      service.login({
        phone: '13800000000',
        password: 'password123',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('revokes refresh tokens on logout', async () => {
    const passwordService = new PasswordService();
    const passwordHash = await passwordService.hashPassword('password123');
    const accountRepository = new FakeAccountRepository([
      {
        ...activeAccount,
        passwordHash,
      },
    ]);
    const refreshTokenStore = new InMemoryRefreshTokenStore();
    const service = new AuthService(
      accountRepository,
      passwordService,
      new TokenService({
        accessSecret: 'access-secret',
        refreshSecret: 'refresh-secret',
      }),
      refreshTokenStore,
    );
    const loginResult = await service.login({
      phone: '13800000000',
      password: 'password123',
    });

    await service.logout({ refreshToken: loginResult.refreshToken });

    await expect(
      service.refresh({
        refreshToken: loginResult.refreshToken,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
