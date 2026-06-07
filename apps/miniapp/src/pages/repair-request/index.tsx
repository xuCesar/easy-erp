import { useState } from 'react';
import type { RepairRequestDraft } from '@easy-erp/shared-types';
import { createRuntimePages } from '../../services';
import { Card, Field, PageShell, PrimaryButton, StatusText } from '../../ui';

export default function RepairRequestPage() {
  const [draft, setDraft] = useState<RepairRequestDraft>({ repairType: 'CLOCK_IN', reason: '' });
  const [status, setStatus] = useState('请填写补卡原因。');

  async function submit() {
    try {
      const result = await createRuntimePages().repairRequest.submit(draft);
      setStatus(`补卡申请已提交：${result.id}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '补卡申请提交失败。');
    }
  }

  return (
    <PageShell title="补卡申请" subtitle="补卡通过审批生成修正链路，不直接改写原始打卡记录。">
      <Card>
        <Field label="补卡原因" value={draft.reason} placeholder="例如：下班忘记打卡" onInput={(reason) => setDraft({ ...draft, reason })} />
        <Field label="目标日期" value={draft.targetDate ?? ''} placeholder="YYYY-MM-DD" onInput={(targetDate) => setDraft({ ...draft, targetDate })} />
        <PrimaryButton onClick={submit}>提交补卡</PrimaryButton>
      </Card>
      <StatusText>{status}</StatusText>
    </PageShell>
  );
}
