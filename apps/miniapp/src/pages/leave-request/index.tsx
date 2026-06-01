import { useState } from 'react';
import { Text, View } from '@tarojs/components';
import type { LeaveRequestDraft, LeaveType } from '@easy-erp/shared-types';
import { createRuntimePages } from '../../services';
import { AttachmentUploadPlaceholder, CardSelectRow, InlineSelectRow, MiniButton, MiniCard, MiniField, MiniHeader, MiniNoticePanel, MiniPage } from '../../components';
import { RouteName } from '../../constants/routes';
import { useAuthGuard } from '../../hooks/useAuthGuard';
import { useSubmitState } from '../../hooks/useSubmitState';
import { switchTab } from '../../router';
import { formatDateTime } from '../../shared/utils/date';

export default function LeaveRequestPage() {
  useAuthGuard();

  const [draft, setDraft] = useState<LeaveRequestDraft>({
    leaveType: 'PERSONAL',
    reason: '',
    durationHours: 8,
  });
  const { isSubmitting, notice, startSubmitting, submitFailed, submitSucceeded } = useSubmitState();

  async function submit() {
    startSubmitting('正在提交请假申请...');

    try {
      await createRuntimePages().leaveRequest.submit(draft);
      submitSucceeded('请假申请已提交。');
      await switchTab(RouteName.REQUESTS);
    } catch (error) {
      submitFailed(error, '请假申请提交失败。');
    }
  }

  return (
    <MiniPage compact>
      <MiniHeader title="请假申请" back />

      <View className="grid gap-[22px]">
        <CardSelectRow label="请假类型" value={leaveTypeLabel(draft.leaveType)} onClick={() => cycleLeaveType(draft.leaveType, (leaveType) => setDraft({ ...draft, leaveType }))} />

        <MiniCard className="p-0">
          <Text className="block px-[28px] py-[26px] text-[29px] font-bold text-[#07112f]">请假时间</Text>
          <View className="border-t border-[#edf0f7]">
            <InlineSelectRow label="开始时间" value={draft.startAt ? formatDateTime(draft.startAt) : '请选择'} onClick={() => setDraft({ ...draft, startAt: new Date().toISOString() })} />
            <InlineSelectRow label="结束时间" value={draft.endAt ? formatDateTime(draft.endAt) : '请选择'} onClick={() => setDraft({ ...draft, endAt: new Date(Date.now() + 8 * 3600000).toISOString() })} />
          </View>
        </MiniCard>

        <MiniField
          label="请假时长"
          value={String(draft.durationHours ?? '')}
          placeholder="请输入请假时长"
          type="number"
          onInput={(durationHours) => setDraft({ ...draft, durationHours: Number(durationHours || 0) })}
        />
        <MiniField
          label="请假事由"
          value={draft.reason}
          placeholder="请输入请假事由（选填）"
          onInput={(reason) => setDraft({ ...draft, reason })}
        />

        <AttachmentUploadPlaceholder />

        {notice ? <MiniNoticePanel notice={notice} /> : null}

        <MiniButton disabled={isSubmitting || !draft.durationHours} onClick={submit}>
          {isSubmitting ? '提交中...' : '提交申请'}
        </MiniButton>
      </View>
    </MiniPage>
  );
}

function cycleLeaveType(current: LeaveType, onChange: (next: LeaveType) => void) {
  const options: LeaveType[] = ['PERSONAL', 'SICK', 'ANNUAL', 'OTHER'];
  const index = options.indexOf(current);
  onChange(options[(index + 1) % options.length]);
}

function leaveTypeLabel(type: LeaveType): string {
  const labels: Record<LeaveType, string> = {
    PERSONAL: '事假',
    SICK: '病假',
    ANNUAL: '年假',
    OTHER: '其他',
  };

  return labels[type] ?? type;
}
