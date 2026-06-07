import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { AccountAuthRecord, AccountRepository } from '../account';
import { PasswordService } from './password.service';
import { RefreshTokenStore } from './refresh-token.store';
import { TokenService } from './token.service';
import { WorkspaceRepository } from './workspace.repository';
import type {
  AuthPrincipal,
  CurrentUserProfileResponse,
  AuthTokenResponse,
  LoginRequest,
  LogoutRequest,
  RefreshRequest,
} from './auth.types';

@Injectable()
export class AuthService {
  constructor(
    private readonly accountRepository: AccountRepository,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly refreshTokenStore: RefreshTokenStore,
    private readonly workspaceRepository: WorkspaceRepository,
  ) {}

  async login(request: LoginRequest): Promise<AuthTokenResponse> {
    const candidates = await this.accountRepository.findCandidatesByPhone(
      request.phone,
    );
    const matchedAccount = await this.findPasswordMatchedAccount(
      request.password,
      candidates,
    );

    if (!matchedAccount) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    if (matchedAccount.status !== 'ACTIVE') {
      throw new ForbiddenException('Account is disabled.');
    }

    await this.accountRepository.markLastLogin(matchedAccount.id, new Date());

    return this.createTokenResponse(this.toPrincipal(matchedAccount));
  }

  async refresh(request: RefreshRequest): Promise<AuthTokenResponse> {
    const claims = this.tokenService.verifyRefreshToken(request.refreshToken);

    if (!claims.jti || (await this.refreshTokenStore.isRevoked(claims.jti))) {
      throw new UnauthorizedException('Invalid token.');
    }

    const account = await this.accountRepository.findById(claims.id);

    if (!account || account.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid token.');
    }

    await this.refreshTokenStore.revoke(claims.jti);

    return this.createTokenResponse(this.toPrincipal(account));
  }

  async logout(request: LogoutRequest): Promise<void> {
    const claims = this.tokenService.verifyRefreshToken(request.refreshToken);

    if (claims.jti) {
      await this.refreshTokenStore.revoke(claims.jti);
    }
  }

  async getCurrentUserProfile(
    principal: AuthPrincipal,
  ): Promise<CurrentUserProfileResponse> {
    const account = await this.accountRepository.findById(principal.id);

    if (!account || account.tenantId !== principal.tenantId) {
      throw new UnauthorizedException('Invalid token.');
    }

    const factories = await this.workspaceRepository.listFactories(
      principal.tenantId,
      account.dataScopes,
    );
    const orgUnits = await this.workspaceRepository.listOrgUnits(
      principal.tenantId,
      factories.map((factory) => factory.id),
    );
    const employee = await this.workspaceRepository.findEmployee(
      principal.tenantId,
      account.employeeId,
    );
    const firstFactory = factories[0] ?? null;

    return {
      user: {
        id: account.id,
        tenantId: account.tenantId,
        employeeId: account.employeeId,
        phone: account.phone,
        roles: account.roles,
        status: account.status,
        dataScopes: account.dataScopes,
      },
      employee: employee
        ? {
            id: employee.id,
            factoryId: employee.factoryId,
            orgUnitId: employee.orgUnitId,
            empNo: employee.empNo,
            name: employee.name,
            phone: employee.phone,
            entryDate: employee.entryDate.toISOString().slice(0, 10),
            status: employee.status,
          }
        : null,
      factories: factories.map((factory) => ({
        id: factory.id,
        name: factory.name,
        timezone: factory.timezone,
        status: factory.status,
      })),
      orgUnits: orgUnits.map((orgUnit) => ({
        id: orgUnit.id,
        factoryId: orgUnit.factoryId,
        parentId: orgUnit.parentId,
        name: orgUnit.name,
        type: orgUnit.type,
        sortOrder: orgUnit.sortOrder,
        status: orgUnit.status,
      })),
      defaultScope: {
        factoryId: firstFactory?.id ?? employee?.factoryId ?? null,
        orgUnitId: employee?.orgUnitId ?? null,
      },
    };
  }

  private async findPasswordMatchedAccount(
    password: string,
    accounts: AccountAuthRecord[],
  ): Promise<AccountAuthRecord | null> {
    for (const account of accounts) {
      if (await this.passwordService.verifyPassword(password, account.passwordHash)) {
        return account;
      }
    }

    return null;
  }

  private async createTokenResponse(
    principal: AuthPrincipal,
  ): Promise<AuthTokenResponse> {
    const refreshToken = this.tokenService.signRefreshToken(principal);
    await this.refreshTokenStore.save({
      tokenId: refreshToken.tokenId,
      tenantId: principal.tenantId,
      accountUserId: principal.id,
      expiresAt: refreshToken.expiresAt,
    });

    return {
      accessToken: this.tokenService.signAccessToken(principal),
      refreshToken: refreshToken.token,
      expiresIn: this.tokenService.getAccessTokenTtlSeconds(),
      user: {
        id: principal.id,
        tenantId: principal.tenantId,
        employeeId: principal.employeeId,
        roles: principal.roles,
      },
    };
  }

  private toPrincipal(account: AccountAuthRecord): AuthPrincipal {
    return {
      id: account.id,
      tenantId: account.tenantId,
      employeeId: account.employeeId,
      roles: account.roles,
      dataScopes: account.dataScopes,
    };
  }
}
