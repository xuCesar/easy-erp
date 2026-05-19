import type {
  ApprovalItem,
  AttendanceGroup,
  AttendanceResultRow,
  EmployeeProfile,
  MonthlyReportRow,
  OrgUnit,
  PaginatedData,
  Shift,
} from '@easy-erp/shared-types';

export type SectionKey =
  | 'organization'
  | 'employees'
  | 'shifts'
  | 'attendanceGroups'
  | 'attendanceResults'
  | 'approvals'
  | 'monthlyReport';

export interface AdminDataState {
  organization: OrgUnit[];
  employees: PaginatedData<EmployeeProfile>;
  shifts: Shift[];
  attendanceGroups: AttendanceGroup[];
  attendanceResults: PaginatedData<AttendanceResultRow>;
  leaveApprovals: PaginatedData<ApprovalItem>;
  repairApprovals: PaginatedData<ApprovalItem>;
  monthlyReport: PaginatedData<MonthlyReportRow>;
}
