import { ConflictException, NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { ReportExportJob } from '../../jobs/report-export.job';
import {
  AttendanceResultService,
  type AttendanceResultRecord,
} from '../attendance';
import { ReportService } from './report.service';
import type {
  CreateReportTaskInput,
  MonthlyReportQuery,
  ReportRepository,
  ReportTaskRecord,
} from './report.repository';

describe('ReportService', () => {
  it('queries monthly attendance results with summary', async () => {
    const service = new ReportService(
      new FakeReportRepository([
        attendanceResult({ employeeId: 'employee-1', workMinutes: 540 }),
        attendanceResult({
          id: 'result-2',
          employeeId: 'employee-2',
          primaryStatus: 'ABNORMAL',
          absenceMinutes: 540,
        }),
      ]),
    );

    const report = await service.getMonthlyReport({
      tenantId: 'tenant-1',
      factoryId: 'factory-1',
      orgUnitId: null,
      month: '2026-05',
    });

    expect(report.summary).toEqual({
      totalEmployees: 2,
      normalDays: 1,
      abnormalDays: 1,
      totalWorkMinutes: 540,
      totalAbsenceMinutes: 540,
      totalOvertimeMinutes: 0,
    });
    expect(report.items).toHaveLength(2);
  });

  it('creates export task and can read task status', async () => {
    const service = new ReportService(new FakeReportRepository());

    const created = await service.createMonthlyExportTask({
      tenantId: 'tenant-1',
      factoryId: 'factory-1',
      orgUnitId: null,
      month: '2026-05',
      requestedBy: 'user-1',
    });
    const task = await service.getExportTask('tenant-1', created.taskId);

    expect(created.taskId).toBe('task-1');
    expect(task).toMatchObject({
      taskId: 'task-1',
      status: 'PENDING',
      downloadUrl: null,
    });
  });

  it('keeps export tasks isolated by tenant', async () => {
    const service = new ReportService(new FakeReportRepository());
    const created = await service.createMonthlyExportTask({
      tenantId: 'tenant-1',
      factoryId: 'factory-1',
      orgUnitId: null,
      month: '2026-05',
      requestedBy: 'user-1',
    });

    await expect(
      service.getExportTask('tenant-2', created.taskId),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns explicit not found error for missing export task', async () => {
    const service = new ReportService(new FakeReportRepository());

    await expect(
      service.getExportTask('tenant-1', 'missing-task'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updates export task completion and failure through job port', async () => {
    const repository = new FakeReportRepository();
    const service = new ReportService(repository);
    const job = new ReportExportJob(repository);
    const created = await service.createMonthlyExportTask({
      tenantId: 'tenant-1',
      factoryId: 'factory-1',
      orgUnitId: null,
      month: '2026-05',
      requestedBy: 'user-1',
    });

    await job.completeTask('tenant-1', created.taskId, 'https://example.test/report.xlsx');
    await expect(service.getExportTask('tenant-1', created.taskId)).resolves.toMatchObject({
      taskId: created.taskId,
      status: 'COMPLETED',
      downloadUrl: 'https://example.test/report.xlsx',
    });

    await job.failTask('tenant-1', created.taskId);
    await expect(service.getExportTask('tenant-1', created.taskId)).resolves.toMatchObject({
      taskId: created.taskId,
      status: 'FAILED',
      downloadUrl: 'https://example.test/report.xlsx',
    });
  });

  it('locks monthly attendance results after confirmed export', async () => {
    const repository = new FakeReportRepository([
      attendanceResult({ employeeId: 'employee-1' }),
      attendanceResult({ id: 'result-2', employeeId: 'employee-2' }),
    ]);
    const service = new ReportService(repository);

    const result = await service.confirmMonthlyExportAndLock({
      tenantId: 'tenant-1',
      factoryId: 'factory-1',
      orgUnitId: null,
      month: '2026-05',
      confirmedBy: 'user-1',
    });

    expect(result.lockedCount).toBe(2);
    expect(repository.results.every((item) => item.isFinalized)).toBe(true);
  });

  it('rejects normal recalculation after monthly report is locked', async () => {
    const locked = attendanceResult({
      isFinalized: true,
      finalizedAt: new Date('2026-05-31T10:00:00.000Z'),
    });
    const attendanceResultService = new AttendanceResultService({
      async findByEmployeeAndDate() {
        return locked;
      },
      async upsert() {
        throw new Error('upsert should not be called for finalized result');
      },
      async list() {
        return { items: [], total: 0 };
      },
    });

    await expect(
      attendanceResultService.recalculate({
        ...locked,
        shift: {
          startTime: '08:00',
          endTime: '17:00',
          crossDay: false,
          workMinutes: 540,
          lateGraceMinutes: 5,
          earlyLeaveGraceMinutes: 0,
          overtimeStartMinutes: 30,
        },
        records: [],
        leaves: [],
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

class FakeReportRepository implements ReportRepository {
  readonly tasks = new Map<string, ReportTaskRecord>();

  constructor(readonly results: AttendanceResultRecord[] = []) {}

  async listMonthlyResults(query: MonthlyReportQuery) {
    return this.results.filter(
      (item) =>
        item.tenantId === query.tenantId &&
        item.factoryId === query.factoryId &&
        item.date.startsWith(query.month),
    );
  }

  async createExportTask(input: CreateReportTaskInput): Promise<ReportTaskRecord> {
    const task: ReportTaskRecord = {
      id: `task-${this.tasks.size + 1}`,
      tenantId: input.tenantId,
      factoryId: input.factoryId,
      orgUnitId: input.orgUnitId,
      month: input.month,
      status: 'PENDING',
      downloadUrl: null,
      requestedBy: input.requestedBy,
      createdAt: new Date('2026-05-31T10:00:00.000Z'),
      updatedAt: new Date('2026-05-31T10:00:00.000Z'),
    };
    this.tasks.set(task.id, task);
    return task;
  }

  async findExportTask(
    tenantId: string,
    id: string,
  ): Promise<ReportTaskRecord | null> {
    const task = this.tasks.get(id);
    return task?.tenantId === tenantId ? task : null;
  }

  async updateExportTask(
    tenantId: string,
    id: string,
    input: Partial<Pick<ReportTaskRecord, 'status' | 'downloadUrl'>>,
  ): Promise<ReportTaskRecord> {
    const task = await this.findExportTask(tenantId, id);
    if (!task) {
      throw new Error('Report task not found.');
    }

    const updated = {
      ...task,
      ...input,
      updatedAt: new Date('2026-05-31T10:01:00.000Z'),
    };
    this.tasks.set(id, updated);
    return updated;
  }

  async finalizeMonthlyResults(query: MonthlyReportQuery): Promise<number> {
    const targetResults = await this.listMonthlyResults(query);

    for (const result of targetResults) {
      result.isFinalized = true;
      result.finalizedAt = new Date('2026-05-31T10:00:00.000Z');
    }

    return targetResults.length;
  }
}

function attendanceResult(
  overrides: Partial<AttendanceResultRecord> = {},
): AttendanceResultRecord {
  return {
    id: 'result-1',
    tenantId: 'tenant-1',
    factoryId: 'factory-1',
    employeeId: 'employee-1',
    attendanceGroupId: 'group-1',
    shiftId: 'shift-1',
    date: '2026-05-17',
    clockInRecordId: null,
    clockOutRecordId: null,
    clockInAt: null,
    clockOutAt: null,
    workMinutes: 0,
    lateMinutes: 0,
    earlyLeaveMinutes: 0,
    absenceMinutes: 0,
    overtimeMinutes: 0,
    primaryStatus: 'NORMAL',
    statusFlags: [],
    anomalyFlags: [],
    calculatedAt: new Date('2026-05-17T18:00:00.000Z'),
    calculationVersion: 1,
    isFinalized: false,
    finalizedAt: null,
    createdAt: new Date('2026-05-17T18:00:00.000Z'),
    updatedAt: new Date('2026-05-17T18:00:00.000Z'),
    deletedAt: null,
    ...overrides,
  };
}
