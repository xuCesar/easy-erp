import { useState } from 'react';
import { Text, View } from '@tarojs/components';
import type { RepairRequestDraft, RepairType } from '@easy-erp/shared-types';
import { createRuntimePages } from '../../services';
import { AttachmentUploadPlaceholder, CardSelectRow, MiniButton, MiniField, MiniHeader, MiniNoticePanel, MiniPage } from '../../components';
import { RouteName } from '../../constants/routes';
import { useAuthGuard } from '../../hooks/useAuthGuard';
import { useSubmitState } from '../../hooks/useSubmitState';
import { switchTab } from '../../router';
import { formatDateTime } from '../../shared/utils/date';

export default function RepairRequestPage() {
  useAuthGuard();

  const [draft, setDraft] = useState<RepairRequestDraft>({
    repairType: 'CLOCK_IN',
    reason: '',
    targetDate: new Date().toISOString().slice(0, 10),
  });
  const { isSubmitting, notice, startSubmitting, submitFailed, submitSucceeded } = useSubmitState();

  async function submit() {
    startSubmitting('正在提交补卡申请...');

    try {
      await createRuntimePages().repairRequest.submit(draft);
      submitSucceeded('补卡申请已提交。');
      await switchTab(RouteName.REQUESTS);
    } catch (error) {
      submitFailed(error, '补卡申请提交失败。');
    }
  }

  return (
    <MiniPage compact>
      <MiniHeader title="补卡申请" back />

      <View className="grid gap-[22px]">
        <CardSelectRow label="补卡类型" value={draft.repairType === 'CLOCK_OUT' ? '下班补卡' : '上班补卡'} onClick={() => setDraft({ ...draft, repairType: nextRepairType(draft.repairType) })} />

        <MiniField
          label="目标日期"
          value={draft.targetDate ?? ''}
          placeholder="YYYY-MM-DD"
          onInput={(targetDate) => setDraft({ ...draft, targetDate })}
        />
        <MiniField
          label="补卡时间"
          value={draft.repairAt ? formatDateTime(draft.repairAt) : ''}
          placeholder="默认使用当前时间"
          onInput={(repairAt) => setDraft({ ...draft, repairAt })}
        />
        <MiniField
          label="补卡原因"
          value={draft.reason}
          placeholder="请输入补卡原因"
          onInput={(reason) => setDraft({ ...draft, reason })}
        />

        <AttachmentUploadPlaceholder />

        {notice ? <MiniNoticePanel notice={notice} /> : null}

        <MiniButton disabled={isSubmitting || !draft.reason || !draft.targetDate} onClick={submit}>
          {isSubmitting ? '提交中...' : '提交申请'}
        </MiniButton>
      </View>
    </MiniPage>
  );
}

function nextRepairType(current: RepairType): RepairType {
  return current === 'CLOCK_OUT' ? 'CLOCK_IN' : 'CLOCK_OUT';
}
