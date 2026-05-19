import { Module } from '@nestjs/common';
import { PrismaAccountRepository } from './account.repository';

export const accountRepositoryToken = Symbol('AccountRepository');

@Module({
  providers: [
    PrismaAccountRepository,
    {
      provide: accountRepositoryToken,
      useExisting: PrismaAccountRepository,
    },
  ],
  exports: [accountRepositoryToken],
})
export class AccountModule {}
