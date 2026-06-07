import { useState } from 'react';
import type {
  AccountUserListItem,
  ApprovalItem,
  ApprovalStatus,
  AttendancePrimaryStatus,
  AttendanceGroup,
  AttendanceResultRow,
  CreateAttendanceGroupRequest,
  CreateEmployeeRequest,
  CreateOrgUnitRequest,
  CreateShiftRequest,
  EmployeeProfile,
  MonthlyReportRow,
  OrgUnit,
  PaginatedData,
  Shift,
  UpdateAttendanceGroupRequest,
  UpdateEmployeeRequest,
} from '@easy-erp/shared-types';
import { createAdminDashboardPage } from '../pages';
import { requestData, type AdminDashboardScope } from '../pages/common';
import type { FetchApiClient } from '../api/client';
import { CrudSection, DataTable, InlineForm } from './ui';

export function OrganizationSection(props: {
  client: FetchApiClient;
  scope: AdminDashboardScope;
  data: OrgUnit[];
  canManage: boolean;
  onChanged: () => Promise<void>;
}) {
  const [name, setName] = useState('');

  async function createOrgUnit() {
    const body: CreateOrgUnitRequest = {
      factoryId: props.scope.factoryId,
      parentId: props.scope.orgUnitId ?? null,
      name,
      type: 'DEPARTMENT',
      sortOrder: props.data.length + 1,
    };

    await requestData(props.client.post<OrgUnit, CreateOrgUnitRequest>('/api/v1/org-units', body));
    setName('');
    await props.onChanged();
  }

  return (
    <CrudSection title="组织单元" canManage={props.canManage}>
      <InlineForm disabled={!props.canManage} onSubmit={createOrgUnit}>
        <input value={name} placeholder="新组织名称" onChange={(event) => setName(event.target.value)} />
      </InlineForm>
      <DataTable
        emptyText="暂无组织单元。小微企业可以只保留工厂，不强制维护多级组织。"
        rows={props.data}
        columns={[
          ['名称', (row) => row.name],
          ['类型', (row) => row.type],
          ['状态', (row) => row.status],
        ]}
      />
    </CrudSection>
  );
}

export function EmployeesSection(props: {
  client: FetchApiClient;
  scope: AdminDashboardScope;
  data: PaginatedData<EmployeeProfile>;
  canManage: boolean;
  onChanged: () => Promise<void>;
}) {
  const [form, setForm] = useState({ empNo: '', name: '', phone: '' });

  async function createEmployee() {
    const body: CreateEmployeeRequest = {
      factoryId: props.scope.factoryId,
      orgUnitId: props.scope.orgUnitId ?? null,
      empNo: form.empNo,
      name: form.name,
      phone: form.phone,
      entryDate: new Date().toISOString().slice(0, 10),
      status: 'ACTIVE',
    };

    await requestData(props.client.post<EmployeeProfile, CreateEmployeeRequest>('/api/v1/employees', body));
    setForm({ empNo: '', name: '', phone: '' });
    await props.onChanged();
  }

  async function updateEmployeeStatus(employee: EmployeeProfile, status: EmployeeProfile['status']) {
    await requestData(
      props.client.patch<EmployeeProfile, UpdateEmployeeRequest>(`/api/v1/employees/${employee.id}`, { status }),
    );
    await props.onChanged();
  }

  return (
    <CrudSection title="员工档案" canManage={props.canManage}>
      <InlineForm disabled={!props.canManage} onSubmit={createEmployee}>
        <input value={form.empNo} placeholder="工号" onChange={(event) => setForm({ ...form, empNo: event.target.value })} />
        <input value={form.name} placeholder="姓名" onChange={(event) => setForm({ ...form, name: event.target.value })} />
        <input value={form.phone} placeholder="手机号" onChange={(event) => setForm({ ...form, phone: event.target.value })} />
      </InlineForm>
      <DataTable
        emptyText="暂无员工。"
        rows={props.data.items}
        columns={[
          ['工号', (row) => row.empNo],
          ['姓名', (row) => row.name],
          ['手机号', (row) => row.phone],
          ['状态', (row) => row.status],
          ['操作', (row) => (
            <div className="rowActions">
              <button disabled={!props.canManage || row.status !== 'ACTIVE'} onClick={() => updateEmployeeStatus(row, 'INACTIVE')}>停用</button>
              <button disabled={!props.canManage || row.status === 'ACTIVE'} onClick={() => updateEmployeeStatus(row, 'ACTIVE')}>恢复</button>
            </div>
          )],
        ]}
      />
    </CrudSection>
  );
}

export function ShiftsSection(props: {
  client: FetchApiClient;
  scope: AdminDashboardScope;
  data: Shift[];
  canManage: boolean;
  onChanged: () => Promise<void>;
}) {
  const [name, setName] = useState('');

  async function createShift() {
    const body: CreateShiftRequest = {
      factoryId: props.scope.factoryId,
      name,
      startTime: '09:00',
      endTime: '18:00',
      crossDay: false,
      workMinutes: 480,
      lateGraceMinutes: 5,
      earlyLeaveGraceMinutes: 5,
      overtimeStartMinutes: 30,
      restStartTime: '12:00',
      restEndTime: '13:00',
      color: '#2563eb',
    };

    await requestData(props.client.post<Shift, CreateShiftRequest>('/api/v1/shifts', body));
    setName('');
    await props.onChanged();
  }

  return (
    <CrudSection title="班次规则" canManage={props.canManage}>
      <InlineForm disabled={!props.canManage} onSubmit={createShift}>
        <input value={name} placeholder="班次名称" onChange={(event) => setName(event.target.value)} />
      </InlineForm>
      <DataTable
        emptyText="暂无班次。"
        rows={props.data}
        columns={[
          ['名称', (row) => row.name],
          ['上班', (row) => row.startTime],
          ['下班', (row) => row.endTime],
          ['工时', (row) => `${row.workMinutes} 分钟`],
        ]}
      />
    </CrudSection>
  );
}

export function AttendanceGroupsSection(props: {
  client: FetchApiClient;
  scope: AdminDashboardScope;
  data: AttendanceGroup[];
  shifts: Shift[];
  canManage: boolean;
  onChanged: () => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [memberForm, setMemberForm] = useState({
    groupId: '',
    employeeIds: '',
    effectiveFrom: new Date().toISOString().slice(0, 10),
  });

  async function createGroup() {
    const shiftId = props.shifts[0]?.id;

    if (!shiftId) {
      throw new Error('请先创建至少一个班次。');
    }

    const body: CreateAttendanceGroupRequest = {
      factoryId: props.scope.factoryId,
      name,
      shiftId,
      checkinMethods: ['GPS'],
      gpsLat: null,
      gpsLng: null,
      gpsRadiusMeters: null,
      wifiSsid: null,
      wifiBssid: null,
      requirePhoto: false,
      allowOutsideCheckin: true,
    };

    await requestData(props.client.post<AttendanceGroup, CreateAttendanceGroupRequest>('/api/v1/attendance-groups', body));
    setName('');
    await props.onChanged();
  }

  async function updateGroup(group: AttendanceGroup, input: UpdateAttendanceGroupRequest) {
    await requestData(
      props.client.patch<AttendanceGroup, UpdateAttendanceGroupRequest>(`/api/v1/attendance-groups/${group.id}`, input),
    );
    await props.onChanged();
  }

  async function assignMembers() {
    if (!memberForm.groupId) {
      throw new Error('请选择考勤组。');
    }

    await requestData(
      props.client.post<unknown, { employeeIds: string[]; effectiveFrom: string }>(
        `/api/v1/attendance-groups/${memberForm.groupId}/members`,
        {
          employeeIds: memberForm.employeeIds.split(',').map((item) => item.trim()).filter(Boolean),
          effectiveFrom: memberForm.effectiveFrom,
        },
      ),
    );
    setMemberForm({ ...memberForm, employeeIds: '' });
    await props.onChanged();
  }

  return (
    <CrudSection title="考勤组" canManage={props.canManage}>
      <InlineForm disabled={!props.canManage} onSubmit={createGroup}>
        <input value={name} placeholder="考勤组名称" onChange={(event) => setName(event.target.value)} />
      </InlineForm>
      <InlineForm disabled={!props.canManage} onSubmit={assignMembers}>
        <select value={memberForm.groupId} onChange={(event) => setMemberForm({ ...memberForm, groupId: event.target.value })}>
          <option value="">选择考勤组</option>
          {props.data.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
        </select>
        <input value={memberForm.employeeIds} placeholder="员工 ID，多个用逗号分隔" onChange={(event) => setMemberForm({ ...memberForm, employeeIds: event.target.value })} />
        <input type="date" value={memberForm.effectiveFrom} onChange={(event) => setMemberForm({ ...memberForm, effectiveFrom: event.target.value })} />
      </InlineForm>
      <DataTable
        emptyText="暂无考勤组。"
        rows={props.data}
        columns={[
          ['名称', (row) => row.name],
          ['打卡方式', (row) => row.checkinMethods.join(', ')],
          ['允许外勤', (row) => (row.allowOutsideCheckin ? '是' : '否')],
          ['拍照', (row) => (row.requirePhoto ? '必填' : '不强制')],
          ['操作', (row) => (
            <div className="rowActions">
              <button disabled={!props.canManage} onClick={() => updateGroup(row, { allowOutsideCheckin: !row.allowOutsideCheckin })}>
                {row.allowOutsideCheckin ? '关闭外勤' : '允许外勤'}
              </button>
              <button disabled={!props.canManage} onClick={() => updateGroup(row, { requirePhoto: !row.requirePhoto })}>
                {row.requirePhoto ? '取消拍照' : '要求拍照'}
              </button>
            </div>
          )],
        ]}
      />
    </CrudSection>
  );
}

export function AttendanceResultsSection(props: {
  data: PaginatedData<AttendanceResultRow>;
  resultStatus: string;
  setResultStatus: (status: string) => void;
  onReload: () => Promise<void>;
}) {
  return (
    <CrudSection title="考勤结果" canManage={false}>
      <div className="approvalBox">
        <select
          value={props.resultStatus}
          onChange={(event) => props.setResultStatus(event.target.value)}
        >
          <option value="">全部状态</option>
          {(['NORMAL', 'ABNORMAL', 'ABSENT', 'LEAVE', 'REST', 'HOLIDAY'] satisfies AttendancePrimaryStatus[]).map((status) => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>
        <button onClick={props.onReload}>按状态筛选</button>
      </div>
      <DataTable
        emptyText="暂无考勤结果。"
        rows={props.data.items}
        columns={[
          ['日期', (row) => row.date],
          ['员工', (row) => `${row.employeeName} (${row.empNo})`],
          ['状态', (row) => row.primaryStatus],
          ['上班', (row) => row.clockInAt ?? '-'],
          ['下班', (row) => row.clockOutAt ?? '-'],
          ['锁定', (row) => (row.isFinalized ? '是' : '否')],
        ]}
      />
    </CrudSection>
  );
}

export function ApprovalsSection(props: {
  client: FetchApiClient;
  scope: AdminDashboardScope;
  leaveData: PaginatedData<ApprovalItem>;
  repairData: PaginatedData<ApprovalItem>;
  approvalStatus: ApprovalStatus;
  setApprovalStatus: (status: ApprovalStatus) => void;
  canManage: boolean;
  onStatus: (status: string) => void;
  onChanged: () => Promise<void>;
}) {
  const [comment, setComment] = useState('同意。');
  const dashboard = createAdminDashboardPage(props.client, props.scope);

  async function approve(type: 'leave' | 'repair', approvalId: string) {
    const page = type === 'leave' ? dashboard.leaveApprovals : dashboard.repairApprovals;
    const feedback = await page.approveSafely(approvalId, comment);
    props.onStatus(feedback.message);
    await props.onChanged();
  }

  async function reject(type: 'leave' | 'repair', approvalId: string) {
    const page = type === 'leave' ? dashboard.leaveApprovals : dashboard.repairApprovals;
    const feedback = await page.rejectSafely(approvalId, comment);
    props.onStatus(feedback.message);
    await props.onChanged();
  }

  const rows = [...props.leaveData.items, ...props.repairData.items].sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt),
  );

  return (
    <CrudSection title="审批操作" canManage={props.canManage}>
      <div className="approvalBox">
        <select
          value={props.approvalStatus}
          onChange={(event) => props.setApprovalStatus(event.target.value as ApprovalStatus)}
        >
          {(['PENDING', 'APPROVED', 'REJECTED'] satisfies ApprovalStatus[]).map((status) => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>
        <input value={comment} placeholder="审批意见" onChange={(event) => setComment(event.target.value)} />
        <button onClick={props.onChanged}>刷新待办</button>
      </div>
      <DataTable
        emptyText="暂无审批单。"
        rows={rows}
        columns={[
          ['类型', (row) => row.type === 'LEAVE' ? '请假' : '补卡'],
          ['员工', (row) => `${row.employeeName} (${row.empNo})`],
          ['状态', (row) => row.status],
          ['原因', (row) => row.reason],
          ['时间', (row) => row.startAt ?? row.targetDate ?? row.createdAt],
          ['操作', (row) => (
            <div className="rowActions">
              <button disabled={!props.canManage || row.status !== 'PENDING'} onClick={() => approve(row.type === 'LEAVE' ? 'leave' : 'repair', row.id)}>通过</button>
              <button disabled={!props.canManage || row.status !== 'PENDING'} onClick={() => reject(row.type === 'LEAVE' ? 'leave' : 'repair', row.id)}>驳回</button>
            </div>
          )],
        ]}
      />
    </CrudSection>
  );
}

export function MonthlyReportSection(props: {
  dashboard: ReturnType<typeof createAdminDashboardPage>;
  data: PaginatedData<MonthlyReportRow>;
  taskId: string;
  setTaskId: (taskId: string) => void;
  canManage: boolean;
  onStatus: (status: string) => void;
}) {
  async function exportReport() {
    const result = await props.dashboard.monthlyReport.export();
    props.setTaskId(result.taskId);
    props.onStatus(`导出任务已创建：${result.taskId}`);
  }

  async function queryTask() {
    const task = await props.dashboard.monthlyReport.getTask(props.taskId);
    props.onStatus(`导出任务 ${task.taskId} 当前状态：${task.status}${task.downloadUrl ? `，下载地址：${task.downloadUrl}` : ''}`);
  }

  return (
    <CrudSection title="月报与导出" canManage={props.canManage}>
      <div className="approvalBox">
        <button disabled={!props.canManage} onClick={exportReport}>创建导出任务</button>
        <input value={props.taskId} placeholder="导出任务 ID" onChange={(event) => props.setTaskId(event.target.value)} />
        <button onClick={queryTask}>查询任务</button>
      </div>
      <DataTable
        emptyText="暂无月报数据。"
        rows={props.data.items}
        columns={[
          ['员工', (row) => `${row.employeeName} (${row.empNo})`],
          ['正常天数', (row) => row.normalDays],
          ['迟到', (row) => row.lateCount],
          ['早退', (row) => row.earlyLeaveCount],
          ['缺勤', (row) => row.absentDays],
          ['锁定', (row) => (row.isFinalized ? '是' : '否')],
        ]}
      />
    </CrudSection>
  );
}

export function AccountsSection(props: {
  dashboard: ReturnType<typeof createAdminDashboardPage>;
  data: PaginatedData<AccountUserListItem>;
  employees: EmployeeProfile[];
  canManage: boolean;
  onChanged: () => Promise<void>;
  onStatus: (status: string) => void;
}) {
  const [form, setForm] = useState({
    phone: '',
    password: '',
    employeeId: '',
    role: 'EMPLOYEE' as const,
  });

  async function createAccount() {
    await props.dashboard.accounts.create({
      phone: form.phone,
      password: form.password,
      employeeId: form.employeeId || null,
      roles: [form.role],
      status: 'ACTIVE',
    });
    setForm({ phone: '', password: '', employeeId: '', role: 'EMPLOYEE' });
    props.onStatus('账号已创建。');
    await props.onChanged();
  }

  async function setStatus(account: AccountUserListItem) {
    await props.dashboard.accounts.setStatus(
      account.id,
      account.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE',
    );
    props.onStatus('账号状态已更新。');
    await props.onChanged();
  }

  return (
    <CrudSection title="账号与角色" canManage={props.canManage}>
      <InlineForm disabled={!props.canManage} onSubmit={createAccount}>
        <input value={form.phone} placeholder="手机号" onChange={(event) => setForm({ ...form, phone: event.target.value })} />
        <input value={form.password} type="password" placeholder="初始密码" onChange={(event) => setForm({ ...form, password: event.target.value })} />
        <select value={form.employeeId} onChange={(event) => setForm({ ...form, employeeId: event.target.value })}>
          <option value="">不绑定员工</option>
          {props.employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name} ({employee.empNo})</option>)}
        </select>
        <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as typeof form.role })}>
          <option value="EMPLOYEE">员工</option>
          <option value="ORG_MANAGER">主管</option>
          <option value="HR_ADMIN">考勤管理员</option>
          <option value="TENANT_ADMIN">租户管理员</option>
        </select>
      </InlineForm>
      <DataTable
        emptyText="暂无账号。"
        rows={props.data.items}
        columns={[
          ['手机号', (row) => row.phone],
          ['员工', (row) => row.employeeName ?? '-'],
          ['角色', (row) => row.roles.join(', ')],
          ['状态', (row) => row.status],
          ['操作', (row) => (
            <button disabled={!props.canManage} onClick={() => setStatus(row)}>
              {row.status === 'ACTIVE' ? '禁用' : '启用'}
            </button>
          )],
        ]}
      />
    </CrudSection>
  );
}
