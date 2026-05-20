import { useState } from 'react';
import type { LeaveRequestDraft } from '@easy-erp/shared-types';
import { createRuntimePages } from '../../services';
import { Card, Field, PageShell, PrimaryButton, StatusText } from '../../ui';

export default function LeaveRequestPage() {
  const [draft, setDraft] = useState<LeaveRequestDraft>({ leaveType: 'PERSONAL', reason: '' });
  const [status, setStatus] = useState('请填写请假原因。');

  async function submit() {
    try {
      const result = await createRuntimePages().leaveRequest.submit(draft);
      setStatus(`请假申请已提交：${result.id}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '请假申请提交失败。');
    }
  }

  return (
    <PageShell title="请假申请" subtitle="Phase 1 只记录请假，不扣减假期余额。">
      <Card>
        <Field label="请假原因" value={draft.reason} placeholder="例如：个人事务" onInput={(reason) => setDraft({ ...draft, reason })} />
        <Field label="请假小时数" value={String(draft.durationHours ?? '')} placeholder="8" onInput={(durationHours) => setDraft({ ...draft, durationHours: Number(durationHours || 0) })} />
        <PrimaryButton onClick={submit}>提交请假</PrimaryButton>
      </Card>
      <StatusText tone={status.includes('失败') ? 'danger' : status.includes('已提交') ? 'success' : 'info'}>{status}</StatusText>
    </PageShell>
  );
}
