import { Module } from '@nestjs/common';
import { AuthModule } from '../../core/auth';
import { FactoryController } from './factory.controller';
import { PrismaFactoryRepository } from './factory.repository';
import { FactoryService } from './factory.service';

export const factoryRepositoryToken = Symbol('FactoryRepository');

@Module({
  imports: [AuthModule],
  controllers: [FactoryController],
  providers: [
    PrismaFactoryRepository,
    {
      provide: factoryRepositoryToken,
      useExisting: PrismaFactoryRepository,
    },
    {
      provide: FactoryService,
      useFactory: (repository: PrismaFactoryRepository) =>
        new FactoryService(repository),
      inject: [factoryRepositoryToken],
    },
  ],
  exports: [FactoryService, factoryRepositoryToken],
})
export class FactoryModule {}
