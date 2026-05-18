import { Module } from '@nestjs/common';
import { TenantModule } from './core/tenant';
import { AppController } from './app.controller';

@Module({
  imports: [TenantModule],
  controllers: [AppController],
})
export class AppModule {}
