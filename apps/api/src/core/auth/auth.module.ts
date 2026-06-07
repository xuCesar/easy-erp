import { Module } from '@nestjs/common';
import { AccountModule, accountRepositoryToken } from '../account';
import { AccessTokenGuard } from './access-token.guard';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import { PrismaRefreshTokenStore } from './refresh-token.store';
import { TokenService } from './token.service';
import { WorkspaceRepository } from './workspace.repository';
import type { AccountRepository } from '../account';

@Module({
  imports: [AccountModule],
  controllers: [AuthController],
  providers: [
    AccessTokenGuard,
    PasswordService,
    TokenService,
    PrismaRefreshTokenStore,
    WorkspaceRepository,
    {
      provide: AuthService,
      useFactory: (
        accountRepository: AccountRepository,
        passwordService: PasswordService,
        tokenService: TokenService,
        refreshTokenStore: PrismaRefreshTokenStore,
        workspaceRepository: WorkspaceRepository,
      ) =>
        new AuthService(
          accountRepository,
          passwordService,
          tokenService,
          refreshTokenStore,
          workspaceRepository,
        ),
      inject: [
        accountRepositoryToken,
        PasswordService,
        TokenService,
        PrismaRefreshTokenStore,
        WorkspaceRepository,
      ],
    },
  ],
  exports: [AccessTokenGuard, AuthService, TokenService],
})
export class AuthModule {}
