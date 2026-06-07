import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { roleNames, type RoleName } from '../permission';
import { PasswordService } from '../auth/password.service';
import type {
  AccountListRecord,
  AccountRepository,
  CreateAccountInput,
  UpdateAccountInput,
} from './account.repository';
import { accountRepositoryToken } from './account.tokens';

export type AccountListResult = {
  items: AccountListRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type CreateAccountRequest = Omit<
  CreateAccountInput,
  'tenantId' | 'passwordHash'
> & {
  password: string;
};

export type UpdateAccountRequest = Omit<UpdateAccountInput, 'passwordHash'> & {
  password?: string;
};

@Injectable()
export class AccountService {
  constructor(
    @Inject(accountRepositoryToken)
    private readonly repository: AccountRepository,
    private readonly passwordService: PasswordService,
  ) {}

  async list(
    tenantId: string,
    query: {
      keyword?: string | null;
      status?: 'ACTIVE' | 'DISABLED';
      page: number;
      pageSize: number;
    },
  ): Promise<AccountListResult> {
    const { items, total } = await this.repository.list(tenantId, query);

    return {
      items,
      total,
      page: query.page,
      pageSize: query.pageSize,
      totalPages: Math.ceil(total / query.pageSize),
    };
  }

  async create(
    tenantId: string,
    request: CreateAccountRequest,
  ): Promise<AccountListRecord> {
    assertRoles(request.roles);
    await this.assertPhoneAvailable(request.phone);

    return this.repository.create({
      tenantId,
      phone: request.phone,
      passwordHash: await this.passwordService.hashPassword(request.password),
      employeeId: request.employeeId,
      roles: request.roles,
      status: request.status,
    });
  }

  async update(
    tenantId: string,
    accountId: string,
    request: UpdateAccountRequest,
  ): Promise<AccountListRecord> {
    if (request.roles) {
      assertRoles(request.roles);
    }

    const current = await this.repository.findById(accountId);

    if (!current || current.tenantId !== tenantId) {
      throw new NotFoundException('Account not found.');
    }

    if (request.phone && request.phone !== current.phone) {
      await this.assertPhoneAvailable(request.phone);
    }

    return this.repository.update(tenantId, accountId, {
      phone: request.phone,
      employeeId: request.employeeId,
      roles: request.roles,
      status: request.status,
      passwordHash: request.password
        ? await this.passwordService.hashPassword(request.password)
        : undefined,
    });
  }

  private async assertPhoneAvailable(phone: string): Promise<void> {
    const candidates = await this.repository.findCandidatesByPhone(phone);

    if (candidates.length > 0) {
      throw new ConflictException('Phone already exists.');
    }
  }
}

function assertRoles(roles: RoleName[]): void {
  if (roles.length === 0 || roles.some((role) => !roleNames.includes(role))) {
    throw new BadRequestException('Invalid account roles.');
  }
}
