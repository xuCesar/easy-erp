import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { AttendanceResultRecord } from '../attendance';
import type {
  CreateReportTaskInput,
  MonthlyReportQuery,
  ReportRepository,
  ReportTaskRecord,
} from './report.repository';

export type MonthlyReport = {
  query: MonthlyReportQuery;
  summary: {
    totalEmployees: number;
    normalDays: number;
    abnormalDays: number;
    totalWorkMinutes: number;
    totalAbsenceMinutes: number;
    totalOvertimeMinutes: number;
  };
  items: AttendanceResultRecord[];
};

export type MonthlyExportTaskResponse = {
  taskId: string;
};

export type MonthlyLockInput = MonthlyReportQuery & {
  confirmedBy: string;
};

export type MonthlyLockResult = {
  lockedCount: number;
  confirmedBy: string;
  lockedAt: Date;
};

@Injectable()
export class ReportService {
  constructor(private readonly repository: ReportRepository) {}

  async getMonthlyReport(query: MonthlyReportQuery): Promise<MonthlyReport> {
    assertMonth(query.month);
    const items = await this.repository.listMonthlyResults(query);
    const employeeIds = new Set(items.map((item) => item.employeeId));

    return {
      query,
      summary: {
        totalEmployees: employeeIds.size,
        normalDays: items.filter((item) => item.primaryStatus === 'NORMAL').length,
        abnormalDays: items.filter((item) => item.primaryStatus === 'ABNORMAL').length,
        totalWorkMinutes: sum(items, 'workMinutes'),
        totalAbsenceMinutes: sum(items, 'absenceMinutes'),
        totalOvertimeMinutes: sum(items, 'overtimeMinutes'),
      },
      items,
    };
  }

  async createMonthlyExportTask(
    input: CreateReportTaskInput,
  ): Promise<MonthlyExportTaskResponse> {
    assertMonth(input.month);
    const task = await this.repository.createExportTask(input);

    return {
      taskId: task.id,
    };
  }

  async getExportTask(
    tenantId: string,
    taskId: string,
  ): Promise<ReportTaskRecord> {
    const task = await this.repository.findExportTask(tenantId, taskId);

    if (!task) {
      throw new NotFoundException('Report task not found.');
    }

    return task;
  }

  async confirmMonthlyExportAndLock(
    input: MonthlyLockInput,
  ): Promise<MonthlyLockResult> {
    assertMonth(input.month);
    const lockedCount = await this.repository.finalizeMonthlyResults(input);

    return {
      lockedCount,
      confirmedBy: input.confirmedBy,
      lockedAt: new Date(),
    };
  }
}

function assertMonth(month: string): void {
  if (!/^\d{4}-\d{2}$/.test(month)) {
    throw new BadRequestException('month must be YYYY-MM.');
  }
}

function sum(
  items: AttendanceResultRecord[],
  key: 'workMinutes' | 'absenceMinutes' | 'overtimeMinutes',
): number {
  return items.reduce((total, item) => total + item[key], 0);
}
