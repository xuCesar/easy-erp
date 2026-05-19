import { describe, expect, it } from 'vitest';
import { toReportTaskRecord } from './report.repository';

describe('toReportTaskRecord', () => {
  it('maps persisted report export task into repository record', () => {
    const createdAt = new Date('2026-05-31T10:00:00.000Z');
    const updatedAt = new Date('2026-05-31T10:01:00.000Z');

    expect(
      toReportTaskRecord({
        id: 'task-id',
        tenantId: 'tenant-1',
        factoryId: 'factory-1',
        orgUnitId: null,
        month: '2026-05',
        status: 'COMPLETED',
        downloadUrl: 'https://example.test/report.xlsx',
        requestedBy: 'user-1',
        createdAt,
        updatedAt,
      }),
    ).toEqual({
      id: 'task-id',
      tenantId: 'tenant-1',
      factoryId: 'factory-1',
      orgUnitId: null,
      month: '2026-05',
      status: 'COMPLETED',
      downloadUrl: 'https://example.test/report.xlsx',
      requestedBy: 'user-1',
      createdAt,
      updatedAt,
    });
  });
});
