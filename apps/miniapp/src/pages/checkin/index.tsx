import { useEffect, useState } from 'react';
import Taro from '@tarojs/taro';
import { Text, View } from '@tarojs/components';
import type { CheckinContext, CheckinType } from '@easy-erp/shared-types';
import { createRuntimePages } from '../../services';
import { Card, PageShell, PrimaryButton, StatusText } from '../../ui';

const lastResultKey = 'easy-erp-miniapp-last-checkin-result';

export default function CheckinPage() {
  const [context, setContext] = useState<CheckinContext | null>(null);
  const [status, setStatus] = useState('正在读取打卡上下文...');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    void loadContext();
  }, []);

  async function loadContext() {
    try {
      const nextContext = await createRuntimePages().checkin.loadContext();
      setContext(nextContext);
      setStatus('打卡上下文已加载。');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '无法读取打卡上下文。');
    }
  }

  async function submit(checkinType: CheckinType) {
    setIsSubmitting(true);
    setStatus('正在提交打卡...');

    const { result, feedback } = await createRuntimePages().checkin.submitSafely({ checkinType });

    if (result) {
      Taro.setStorageSync(lastResultKey, result);
      await Taro.navigateTo({ url: '/pages/checkin-result/index' });
    }

    setStatus(feedback.message);
    setIsSubmitting(false);
  }

  const nextAction = context?.status.nextAction === 'NONE' ? null : context?.status.nextAction;

  return (
    <PageShell title="移动打卡" subtitle="Phase 1.5 先完成 API 对接和状态语义，定位、Wi-Fi、拍照可随考勤组规则逐步接入。">
      <Card>
        <View className="listItem">
          <Text className="itemTitle">{context?.attendanceGroup.name ?? '未加载考勤组'}</Text>
          <Text className="itemMeta">班次：{context?.shift.name ?? '-'}</Text>
          <Text className="itemMeta">日期：{context?.date ?? '-'}</Text>
          <Text className="itemMeta">下一动作：{nextAction ?? '今日无需打卡'}</Text>
        </View>
        <PrimaryButton disabled={!nextAction || isSubmitting} onClick={() => submit(nextAction ?? 'CLOCK_IN')}>
          {nextAction === 'CLOCK_OUT' ? '下班打卡' : '上班打卡'}
        </PrimaryButton>
        <PrimaryButton onClick={() => Taro.navigateTo({ url: '/pages/attendance-records/index' })}>查看考勤记录</PrimaryButton>
      </Card>
      <StatusText>{status}</StatusText>
    </PageShell>
  );
}
