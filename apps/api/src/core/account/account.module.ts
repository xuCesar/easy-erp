import { Module } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { PasswordService } from '../auth/password.service';
import { TokenService } from '../auth/token.service';
import { PermissionModule } from '../permission';
import { AccountController } from './account.controller';
import { PrismaAccountRepository } from './account.repository';
import { AccountService } from './account.service';
import { accountRepositoryToken } from './account.tokens';

@Module({
  imports: [PermissionModule],
  providers: [
    AccessTokenGuard,
    PasswordService,
    TokenService,
    PrismaAccountRepository,
    AccountService,
    {
      provide: accountRepositoryToken,
      useExisting: PrismaAccountRepository,
    },
  ],
  controllers: [AccountController],
  exports: [accountRepositoryToken, AccountService],
})
export class AccountModule {}
