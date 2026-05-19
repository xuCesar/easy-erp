import { Module } from '@nestjs/common';
import { AuthModule } from '../../core/auth';
import { PermissionModule } from '../../core/permission';
import { ReportExportJob } from '../../jobs/report-export.job';
import { ReportController } from './report.controller';
import { PrismaReportRepository } from './report.repository';
import { ReportService } from './report.service';

export const reportRepositoryToken = Symbol('ReportRepository');

@Module({
  imports: [AuthModule, PermissionModule],
  controllers: [ReportController],
  providers: [
    PrismaReportRepository,
    {
      provide: reportRepositoryToken,
      useExisting: PrismaReportRepository,
    },
    {
      provide: ReportService,
      useFactory: (repository: PrismaReportRepository) =>
        new ReportService(repository),
      inject: [reportRepositoryToken],
    },
    {
      provide: ReportExportJob,
      useFactory: (repository: PrismaReportRepository) =>
        new ReportExportJob(repository),
      inject: [reportRepositoryToken],
    },
  ],
  exports: [ReportService, ReportExportJob, reportRepositoryToken],
})
export class ReportModule {}
