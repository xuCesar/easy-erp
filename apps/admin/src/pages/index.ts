import type { ApiClient } from '@easy-erp/shared-types';
import type { AdminDashboardScope } from './common';
import { createAttendanceGroupsPage } from './attendance-groups';
import { createAttendanceResultsPage } from './attendance-results';
import { createEmployeesPage } from './employees';
import { createLeaveApprovalsPage, createRepairApprovalsPage } from './approvals';
import { createMonthlyReportPage } from './monthly-report';
import { createOrganizationPage } from './organization';
import { createShiftsPage } from './shifts';

export function createAdminDashboardPage(client: ApiClient, scope: AdminDashboardScope) {
  return {
    organization: createOrganizationPage(client, scope),
    employees: createEmployeesPage(client, scope),
    shifts: createShiftsPage(client, scope),
    attendanceGroups: createAttendanceGroupsPage(client, scope),
    attendanceResults: createAttendanceResultsPage(client, scope),
    leaveApprovals: createLeaveApprovalsPage(client, scope),
    repairApprovals: createRepairApprovalsPage(client, scope),
    monthlyReport: createMonthlyReportPage(client, scope),
  };
}

export type { AdminDashboardScope, AdminFeedback } from './common';
