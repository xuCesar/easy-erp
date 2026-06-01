import { useEffect, useMemo, useState } from 'react';
import { Button, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import type { CheckinContext, CheckinType } from '@easy-erp/shared-types';
import { Check, LocateFixed, MapPin } from 'lucide-react-taro';
import { createRuntimePages } from '../../services';
import { MiniCard, MiniHeader, MiniNoticePanel, MiniPage, MiniStatus } from '../../components';
import { RouteName } from '../../constants/routes';
import { useAuthGuard } from '../../hooks/useAuthGuard';
import { usePageNotice } from '../../hooks/usePageNotice';
import { navigateTo } from '../../router';
import { STORAGE_KEYS } from '../../shared/constants/app';
import { formatTime, formatWeekdayDate } from '../../shared/utils/date';

export default function CheckinPage() {
  useAuthGuard();

  const [context, setContext] = useState<CheckinContext | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { notice, clearNotice, showError, showNotice, showWarning } = usePageNotice();
  const nowText = useMemo(() => formatTime(new Date()), []);

  useEffect(() => {
    void loadContext();
  }, []);

  async function loadContext() {
    setIsLoading(true);
    clearNotice();

    try {
      const nextContext = await createRuntimePages().checkin.loadContext();
      setContext(nextContext);
    } catch (error) {
      showError(error, '无法读取打卡上下文。', '加载失败');
    } finally {
      setIsLoading(false);
    }
  }

  async function submit(checkinType: CheckinType) {
    setIsSubmitting(true);
    showWarning('正在提交打卡...');

    const { result, feedback } = await createRuntimePages().checkin.submitSafely({ checkinType });

    if (result) {
      Taro.setStorageSync(STORAGE_KEYS.lastCheckinResult, result);
      await navigateTo(RouteName.CHECKIN_RESULT);
    }

    setIsSubmitting(false);
    showNotice(
      feedback.type === 'success'
        ? 'success'
        : feedback.type === 'network-retry'
          ? 'warning'
          : 'danger',
      feedback.message,
    );
  }

  const nextAction = context?.status.nextAction === 'NONE' ? null : context?.status.nextAction;
  const primaryLabel = isSubmitting
    ? '提交中'
    : nextAction === 'CLOCK_OUT'
      ? '下班打卡'
      : nextAction === 'CLOCK_IN'
        ? '上班打卡'
        : '已完成';
  const isPrimaryDisabled = !nextAction || isSubmitting || isLoading;

  return (
    <MiniPage compact>
      <MiniHeader
        title="打卡"
        back
        right={<MiniStatus tone="success">定位正常</MiniStatus>}
      />

      <View className="mb-[46px] flex items-center justify-between gap-[18px]">
        <View className="flex min-w-0 flex-1 items-center gap-[12px]">
          <MapPin color="#5b55ff" size={30} strokeWidth={2} />
          <Text className="block truncate text-[28px] font-semibold text-[#667085]">
            示例科技大厦 · 3楼
          </Text>
        </View>
      </View>

      <View className="items-center">
        <Text className="block text-center text-[58px] font-extrabold tracking-[1px] text-[#07112f]">
          {context?.status.clockInAt ?? nowText}
        </Text>
        <Text className="mt-[14px] block text-center text-[29px] font-semibold text-[#667085]">
          {context?.date ?? formatWeekdayDate(new Date())}
        </Text>
      </View>

      <View className="mt-[58px] items-center">
        <Button
          className={`primaryButton flex h-[250px] w-[250px] box-border items-center justify-center rounded-full border-0 px-[20px] text-center text-[38px] font-extrabold leading-[1.25] text-white shadow-[0_24px_68px_rgba(91,85,255,0.3)] ${
            isPrimaryDisabled ? 'bg-[#a6a1ff] opacity-70' : 'bg-[#5b55ff]'
          }`}
          disabled={isPrimaryDisabled}
          onClick={() => submit(nextAction ?? 'CLOCK_IN')}
        >
          <View>
            <Text className="block text-center text-[38px] font-extrabold text-white">{primaryLabel}</Text>
            <Text className="mt-[14px] block text-center text-[28px] font-semibold text-white/90">
              {context?.status.clockInAt ?? nowText}
            </Text>
          </View>
        </Button>
      </View>

      <View className="mt-[42px] flex items-center justify-center gap-[12px]">
        <View className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-[#22c55e]">
          <Check color="#ffffff" size={18} strokeWidth={2.6} />
        </View>
        <Text className="text-[28px] font-semibold text-[#667085]">已进入考勤范围：100米</Text>
      </View>

      <MiniCard className="mt-[36px] h-[270px] overflow-hidden bg-[#f7f8fb] p-0">
        <View className="relative h-full w-full">
          <View className="absolute left-[30px] top-[54px] h-[2px] w-[560px] rotate-[12deg] bg-[#dfe4ef]" />
          <View className="absolute left-[40px] top-[142px] h-[2px] w-[560px] -rotate-[18deg] bg-[#dfe4ef]" />
          <View className="absolute left-[150px] top-0 h-[270px] w-[2px] rotate-[18deg] bg-[#dfe4ef]" />
          <View className="absolute left-[330px] top-0 h-[270px] w-[2px] -rotate-[16deg] bg-[#dfe4ef]" />
          <View className="absolute left-[382px] top-[112px] flex h-[68px] w-[68px] items-center justify-center rounded-[18px] bg-[#5b55ff] shadow-[0_12px_28px_rgba(91,85,255,0.28)]">
            <LocateFixed color="#ffffff" size={32} strokeWidth={2} />
          </View>
          <View className="absolute left-[390px] top-[178px] h-[52px] w-[52px] rounded-full border-[8px] border-white bg-[#3178ff] shadow-[0_10px_24px_rgba(49,120,255,0.24)]" />
        </View>
      </MiniCard>

      {notice ? <MiniNoticePanel className="mt-[24px]" notice={notice} /> : null}
    </MiniPage>
  );
}
