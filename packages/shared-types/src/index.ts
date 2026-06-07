export type ApiResponse<TData> = ApiSuccessResponse<TData> | ApiErrorResponse;

export interface ApiSuccessResponse<TData> {
  code: 0;
  message: 'success' | string;
  data: TData;
  requestId: string;
}

export interface ApiErrorResponse {
  code: ApiErrorCode;
  message: string;
  data: null;
  requestId: string;
}

export type ApiErrorCode =
  | 40001
  | 40101
  | 40301
  | 40401
  | 40901
  | 42201
  | 50001
  | number;

export interface PaginatedData<TItem> {
  items: TItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiClient {
  get<TData>(path: string, options?: ApiRequestOptions): Promise<ApiResponse<TData>>;
  post<TData, TBody = unknown>(path: string, body?: TBody, options?: ApiRequestOptions): Promise<ApiResponse<TData>>;
  patch<TData, TBody = unknown>(path: string, body?: TBody, options?: ApiRequestOptions): Promise<ApiResponse<TData>>;
  delete<TData>(path: string, options?: ApiRequestOptions): Promise<ApiResponse<TData>>;
}

export interface ApiRequestOptions {
  headers?: Record<string, string>;
  retry?: RetryPolicy;
}

export interface RetryPolicy {
  attempts: number;
  retryOn?: 'network' | 'network-or-5xx';
}

export type Role = 'TENANT_ADMIN' | 'HR_ADMIN' | 'ORG_MANAGER' | 'EMPLOYEE';
export type AccountStatus = 'ACTIVE' | 'DISABLED';
export type EntityStatus = 'ACTIVE' | 'DISABLED';
export type EmployeeStatus = 'ACTIVE' | 'INACTIVE' | 'RESIGNED';
export type OrgUnitType = 'FACTORY' | 'DEPARTMENT' | 'GROUP';
export type CheckinMethod = 'GPS' | 'WIFI' | 'PHOTO';
export type CheckinType = 'CLOCK_IN' | 'CLOCK_OUT';
export type NextCheckinAction = CheckinType | 'NONE';
export type AttendancePrimaryStatus = 'NORMAL' | 'ABNORMAL' | 'ABSENT' | 'LEAVE' | 'REST' | 'HOLIDAY';
export type LeaveType = 'PERSONAL' | 'SICK' | 'ANNUAL' | 'OTHER';
export type RepairType = CheckinType;
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type ReportTaskStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
export type DataScopeType = 'TENANT' | 'FACTORY' | 'ORG_UNIT' | 'EMPLOYEE';

export interface DataScope {
  type: DataScopeType;
  factoryId?: string;
  orgUnitId?: string;
  employeeId?: string;
}

export interface LoginRequest {
  phone: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: CurrentUser;
}

export interface CurrentUser {
  id: string;
  tenantId: string;
  employeeId: string | null;
  roles: Role[];
}

export interface FactoryOption {
  id: string;
  name: string;
  timezone: string;
  status: Exclude<EntityStatus, 'RESIGNED'>;
}

export interface CurrentUserProfile {
  user: CurrentUser & {
    phone: string;
    status: AccountStatus;
    dataScopes: DataScope[];
  };
  employee: EmployeeProfile | null;
  factories: FactoryOption[];
  orgUnits: OrgUnit[];
  defaultScope: {
    factoryId: string | null;
    orgUnitId: string | null;
  };
}

export interface AccountUserListItem {
  id: string;
  phone: string;
  employeeId: string | null;
  employeeName: string | null;
  roles: Role[];
  status: AccountStatus;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface AccountUserQuery {
  keyword?: string;
  status?: AccountStatus;
  page?: number;
  pageSize?: number;
}

export interface CreateAccountUserRequest {
  phone: string;
  password: string;
  employeeId: string | null;
  roles: Role[];
  status: AccountStatus;
}

export type UpdateAccountUserRequest = Partial<{
  phone: string;
  password: string;
  employeeId: string | null;
  roles: Role[];
  status: AccountStatus;
}>;

export interface OrgUnit {
  id: string;
  factoryId: string;
  parentId: string | null;
  name: string;
  type: OrgUnitType;
  sortOrder: number;
  status: Exclude<EntityStatus, 'RESIGNED'>;
}

export interface CreateOrgUnitRequest {
  factoryId: string;
  parentId: string | null;
  name: string;
  type: OrgUnitType;
  sortOrder: number;
}

export interface UpdateOrgUnitRequest {
  parentId?: string | null;
  name?: string;
  type?: OrgUnitType;
  sortOrder?: number;
  status?: Exclude<EntityStatus, 'RESIGNED'>;
}

export type UpsertOrgUnitRequest = CreateOrgUnitRequest | UpdateOrgUnitRequest;

export interface EmployeeProfile {
  id: string;
  factoryId: string;
  orgUnitId: string | null;
  empNo: string;
  name: string;
  phone: string;
  entryDate: string;
  status: EmployeeStatus;
}

export interface EmployeeQuery {
  factoryId: string;
  orgUnitId?: string | null;
  status?: EmployeeStatus;
  keyword?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateEmployeeRequest {
  factoryId: string;
  orgUnitId: string | null;
  empNo: string;
  name: string;
  phone: string;
  entryDate: string;
  status: EmployeeStatus;
}

export type UpdateEmployeeRequest = Partial<Omit<CreateEmployeeRequest, 'factoryId'>>;
export type UpsertEmployeeRequest = CreateEmployeeRequest | UpdateEmployeeRequest;

export interface Shift {
  id: string;
  factoryId: string;
  name: string;
  startTime: string;
  endTime: string;
  crossDay: boolean;
  workMinutes: number;
  lateGraceMinutes: number;
  earlyLeaveGraceMinutes: number;
  overtimeStartMinutes: number;
  restStartTime: string | null;
  restEndTime: string | null;
  color: string | null;
}

export type CreateShiftRequest = Omit<Shift, 'id'>;
export type UpdateShiftRequest = Partial<CreateShiftRequest>;
export type UpsertShiftRequest = CreateShiftRequest | UpdateShiftRequest;

export interface AttendanceGroup {
  id: string;
  factoryId: string;
  name: string;
  shiftId: string;
  checkinMethods: CheckinMethod[];
  gpsLat: number | null;
  gpsLng: number | null;
  gpsRadiusMeters: number | null;
  wifiSsid: string | null;
  wifiBssid: string | null;
  requirePhoto: boolean;
  allowOutsideCheckin: boolean;
}

export type CreateAttendanceGroupRequest = Omit<AttendanceGroup, 'id'>;
export type UpdateAttendanceGroupRequest = Partial<CreateAttendanceGroupRequest>;
export type UpsertAttendanceGroupRequest = CreateAttendanceGroupRequest | UpdateAttendanceGroupRequest;

export interface AssignAttendanceGroupMembersRequest {
  employeeIds: string[];
  effectiveFrom: string;
}

export interface CheckinContext {
  date: string;
  shift: Pick<Shift, 'id' | 'name' | 'startTime' | 'endTime' | 'crossDay'>;
  attendanceGroup: Pick<
    AttendanceGroup,
    | 'id'
    | 'name'
    | 'checkinMethods'
    | 'gpsLat'
    | 'gpsLng'
    | 'gpsRadiusMeters'
    | 'wifiSsid'
    | 'wifiBssid'
    | 'requirePhoto'
    | 'allowOutsideCheckin'
  >;
  status: {
    clockInAt: string | null;
    clockOutAt: string | null;
    nextAction: NextCheckinAction;
  };
}

export interface CheckinRequest {
  checkinType: CheckinType;
  clientEventAt: string;
  idempotencyKey: string;
  location?: GeoLocationPayload;
  wifi?: WifiPayload;
  deviceId?: string;
  photoUrl?: string | null;
}

export interface CheckinResult {
  recordId: string;
  checkinType: CheckinType;
  checkinAt: string;
  isValid: boolean;
  invalidReason: string | null;
  message: string;
}

export interface GeoLocationPayload {
  latitude: number;
  longitude: number;
}

export interface WifiPayload {
  ssid: string;
  bssid: string;
}

export interface AttendanceResultQuery {
  factoryId?: string;
  employeeId?: string;
  orgUnitId?: string | null;
  startDate: string;
  endDate: string;
  primaryStatus?: AttendancePrimaryStatus;
  page?: number;
  pageSize?: number;
}

export interface AttendanceResultRow {
  id: string;
  employeeId: string;
  employeeName: string;
  empNo: string;
  date: string;
  primaryStatus: AttendancePrimaryStatus;
  clockInAt: string | null;
  clockOutAt: string | null;
  workMinutes: number;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  isFinalized: boolean;
}

export interface RecalculateAttendanceRequest {
  employeeIds: string[];
  startDate: string;
  endDate: string;
  reason: string;
}

export interface ApprovalItem {
  id: string;
  type: 'LEAVE' | 'REPAIR';
  factoryId: string;
  employeeId: string;
  employeeName: string;
  empNo: string;
  status: ApprovalStatus;
  reason: string;
  createdAt: string;
  startAt?: string;
  endAt?: string;
  durationHours?: number;
  leaveType?: LeaveType;
  targetDate?: string;
  repairAt?: string;
  repairType?: RepairType;
}

export interface LeaveRequestCreateRequest {
  leaveType: LeaveType;
  startAt: string;
  endAt: string;
  durationHours: number;
  reason: string;
  attachments: string[];
}

export interface LeaveRequestDraft {
  leaveType: LeaveType;
  reason: string;
  startAt?: string;
  endAt?: string;
  durationHours?: number;
  attachments?: string[];
}

export interface RepairRequestCreateRequest {
  targetDate: string;
  repairType: RepairType;
  repairAt: string;
  reason: string;
  attachments: string[];
}

export interface RepairRequestDraft {
  repairType: RepairType;
  reason: string;
  targetDate?: string;
  repairAt?: string;
  attachments?: string[];
}

export interface ApprovalActionRequest {
  comment: string;
}

export interface RejectActionRequest {
  rejectReason: string;
}

export interface MonthlyReportQuery {
  factoryId: string;
  orgUnitId?: string | null;
  month: string;
}

export interface MonthlyReportRow {
  employeeId: string;
  employeeName: string;
  empNo: string;
  normalDays: number;
  lateCount: number;
  earlyLeaveCount: number;
  absentDays: number;
  leaveHours: number;
  overtimeMinutes: number;
  isFinalized: boolean;
}

export interface MonthlyReportExportRequest {
  factoryId: string;
  orgUnitId: string | null;
  month: string;
}

export interface MonthlyReportExportResponse {
  taskId: string;
}

export interface ReportTask {
  taskId: string;
  status: ReportTaskStatus;
  downloadUrl: string | null;
}
