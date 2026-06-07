import type { ApiClient, ApiResponse, CheckinContext, CheckinResult } from '@easy-erp/shared-types';
import { createMiniappPages } from './index';

let postCount = 0;

function success<TData>(data: TData): Promise<ApiResponse<TData>> {
  return Promise.resolve({ code: 0, message: 'success', data, requestId: 'req-1' });
}

const client: ApiClient = {
  get: <TData>(path: string) =>
    success(
      (path.includes('checkin-context')
      ? {
          date: '2026-05-17',
          shift: { id: 'shift-1', name: '白班', startTime: '08:00', endTime: '17:00', crossDay: false },
          attendanceGroup: { id: 'group-1', name: '生产一组考勤', checkinMethods: ['GPS'], requirePhoto: false },
          status: { clockInAt: null, clockOutAt: null, nextAction: 'CLOCK_IN' },
        }
      : {}) as TData,
    ),
  post: <TData>() => {
    postCount += 1;
    return success(
      {
        recordId: 'record-1',
        checkinType: 'CLOCK_IN',
        checkinAt: '2026-05-17T08:00:05+08:00',
        isValid: true,
        invalidReason: null,
        message: '打卡成功',
      } as TData,
    );
  },
  patch: <TData>() => success({} as TData),
  delete: <TData>() => success({} as TData),
};

const pages = createMiniappPages(client, {
  now: () => '2026-05-17T08:00:03+08:00',
  idempotencyKey: () => 'device-1:2026-05-17:CLOCK_IN:nonce',
});

const context: Promise<CheckinContext> = pages.checkin.loadContext();
const result: Promise<CheckinResult> = pages.checkin.submit({
  checkinType: 'CLOCK_IN',
  location: { latitude: 30.1234567, longitude: 120.1234567 },
});

pages.login.submit({ phone: '13800000000', password: 'password123' });
pages.records.search({ startDate: '2026-05-01', endDate: '2026-05-31' });
pages.leaveRequest.submit({ leaveType: 'PERSONAL', reason: '个人事务' });
pages.repairRequest.submit({ repairType: 'CLOCK_OUT', reason: '下班忘记打卡' });
pages.profile.load();

void context;
void result;
void postCount;
