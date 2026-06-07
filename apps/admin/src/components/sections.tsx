import { useState } from 'react';
import type {
  ApprovalItem,
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

  return (
    <CrudSection title="考勤组" canManage={props.canManage}>
      <InlineForm disabled={!props.canManage} onSubmit={createGroup}>
        <input value={name} placeholder="考勤组名称" onChange={(event) => setName(event.target.value)} />
      </InlineForm>
      <DataTable
        emptyText="暂无考勤组。"
        rows={props.data}
        columns={[
          ['名称', (row) => row.name],
          ['打卡方式', (row) => row.checkinMethods.join(', ')],
          ['允许外勤', (row) => (row.allowOutsideCheckin ? '是' : '否')],
          ['拍照', (row) => (row.requirePhoto ? '必填' : '不强制')],
        ]}
      />
    </CrudSection>
  );
}

export function AttendanceResultsSection(props: { data: PaginatedData<AttendanceResultRow> }) {
  return (
    <CrudSection title="考勤结果" canManage={false}>
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
  canManage: boolean;
  onStatus: (status: string) => void;
}) {
  const [approvalId, setApprovalId] = useState('');
  const [comment, setComment] = useState('同意。');
  const dashboard = createAdminDashboardPage(props.client, props.scope);

  async function approve(type: 'leave' | 'repair') {
    const page = type === 'leave' ? dashboard.leaveApprovals : dashboard.repairApprovals;
    const feedback = await page.approveSafely(approvalId, comment);
    props.onStatus(feedback.message);
  }

  async function reject(type: 'leave' | 'repair') {
    const page = type === 'leave' ? dashboard.leaveApprovals : dashboard.repairApprovals;
    const feedback = await page.rejectSafely(approvalId, comment);
    props.onStatus(feedback.message);
  }

  return (
    <CrudSection title="审批操作" canManage={props.canManage}>
      <div className="approvalBox">
        <input value={approvalId} placeholder="审批单 ID" onChange={(event) => setApprovalId(event.target.value)} />
        <input value={comment} placeholder="审批意见" onChange={(event) => setComment(event.target.value)} />
        <button disabled={!props.canManage} onClick={() => approve('leave')}>通过请假</button>
        <button disabled={!props.canManage} onClick={() => reject('leave')}>驳回请假</button>
        <button disabled={!props.canManage} onClick={() => approve('repair')}>通过补卡</button>
        <button disabled={!props.canManage} onClick={() => reject('repair')}>驳回补卡</button>
      </div>
      <p className="hint">当前后端 Phase 1 只提供审批动作接口，列表展示后续可随审批查询接口补齐。</p>
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
