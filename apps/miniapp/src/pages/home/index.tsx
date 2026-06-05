import { useEffect, useMemo, useState } from 'react';
import { Text, View } from '@tarojs/components';
import type { CheckinContext, EmployeeProfileSummary } from '@easy-erp/shared-types';
import { Bell, CalendarDays, CircleCheckBig, ClipboardCheck, Navigation, RotateCcw } from 'lucide-react-taro';
import { createRuntimeServices } from '../../services';
import { toastInfo } from '../../feedback';
import {
  Chevron,
  MiniEmpty,
  MiniHeader,
  MiniPage,
  type MiniIconComponent,
} from '../../components';
import { RouteName } from '../../constants/routes';
import { useAuthGuard } from '../../hooks/useAuthGuard';
import { navigateTo } from '../../router';
import { formatWeekdayDate } from '../../shared/utils/date';
import { getErrorMessage } from '../../api';

type HomeState = {
  profile: EmployeeProfileSummary | null;
  checkin: CheckinContext | null;
  error: string;
  isLoading: boolean;
};

export default function HomePage() {
  useAuthGuard();

  const [state, setState] = useState<HomeState>({
    profile: null,
    checkin: null,
    error: '',
    isLoading: true,
  });

  useEffect(() => {
    void loadHome();
  }, []);

  async function loadHome() {
    setState((current) => ({ ...current, isLoading: true, error: '' }));

    try {
      const services = createRuntimeServices();
      const profile = await services.profile.load();
      const checkin = profile.employee ? await services.checkin.loadContext() : null;
      setState({ profile, checkin, error: '', isLoading: false });
    } catch (error) {
      setState((current) => ({
        ...current,
        error: getErrorMessage(error, '工作台数据加载失败。'),
        isLoading: false,
      }));
    }
  }

  const employee = state.profile?.employee ?? null;
  const todayText = useMemo(() => formatWeekdayDate(new Date()), []);

  return (
    <MiniPage>
      <MiniHeader title="工作台" right={<Bell color="#07112f" size={32} strokeWidth={1.9} />} />

      <View className="mb-[34px]">
        <Text className="block text-[38px] font-extrabold leading-[1.25] text-[#07112f]">
          你好，{employee?.name ?? '员工'}
        </Text>
        <Text className="mt-[10px] block text-[27px] leading-[1.35] text-[#667085]">
          今天是 {todayText}
        </Text>
      </View>

      {state.isLoading ? (
        <HomeCard className="mb-[24px]">
          <Text className="block text-[28px] font-bold text-[#667085]">正在同步今日考勤状态...</Text>
        </HomeCard>
      ) : null}

      {state.error ? (
        <HomeCard className="mb-[24px]">
          <MiniEmpty title="加载失败" description={state.error} />
        </HomeCard>
      ) : null}

      {!state.isLoading && !employee ? (
        <HomeCard className="mb-[24px]">
          <MiniEmpty title="未绑定员工档案" description="当前账号还没有员工档案，打卡和申请暂不可用。" />
        </HomeCard>
      ) : null}

      {employee ? <TodayStatusCard context={state.checkin} /> : null}
      {employee ? <ShortcutGrid /> : null}
      {employee ? <ShiftCard context={state.checkin} /> : null}
      {employee ? <MonthlySummary /> : null}
    </MiniPage>
  );
}

function TodayStatusCard(props: { context: CheckinContext | null }) {
  const completed = props.context?.status.nextAction === 'NONE';
  const clockInAt = props.context?.status.clockInAt;
  const nextAction = props.context?.status.nextAction;

  return (
    <HomeCard className="mb-[30px]">
      <Text className="block text-[26px] font-bold leading-[1.25] text-[#667085]">今日考勤状态</Text>
      <View
        className="mt-[24px] flex items-center gap-[26px]"
        onClick={() => navigateTo(RouteName.CHECKIN)}
      >
        <View className="flex h-[92px] w-[92px] shrink-0 items-center justify-center rounded-full bg-[#5b55ff] shadow-[0_18px_42px_rgba(91,85,255,0.22)]">
          <CircleCheckBig color="#ffffff" size={70} strokeWidth={1.9} />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="block text-[40px] font-extrabold leading-[1.18] text-[#07112f]">
            {completed ? '已打卡' : nextAction === 'CLOCK_OUT' ? '待下班打卡' : '待上班打卡'}
          </Text>
          <Text className="mt-[10px] block text-[28px] leading-[1.25] text-[#667085]">
            上班 {clockInAt ?? '--:--'}
          </Text>
        </View>
        <Chevron />
      </View>
    </HomeCard>
  );
}

function ShortcutGrid() {
  const shortcuts: Array<{ title: string; icon: MiniIconComponent; routeName?: RouteName }> = [
    { title: '打卡', icon: ClipboardCheck, routeName: RouteName.CHECKIN },
    { title: '请假', icon: CalendarDays, routeName: RouteName.LEAVE_REQUEST },
    { title: '补卡', icon: RotateCcw, routeName: RouteName.REPAIR_REQUEST },
    { title: '外出', icon: Navigation },
  ];

  return (
    <View className="mb-[34px] grid grid-cols-4 gap-[18px] px-[2px]">
      {shortcuts.map((item) => (
        <View
          key={item.title}
          className="flex flex-col items-center"
          onClick={() => {
            if (item.routeName) {
              navigateTo(item.routeName);
              return;
            }

            toastInfo('外出申请待接入');
          }}
        >
          <HomeShortcutIcon icon={item.icon} />
          <Text className="mt-[16px] block text-center text-[26px] font-bold leading-[1.2] text-[#07112f]">{item.title}</Text>
        </View>
      ))}
    </View>
  );
}

function ShiftCard(props: { context: CheckinContext | null }) {
  return (
    <HomeCard className="mb-[26px]">
      <View className="flex items-center justify-between gap-[20px]">
        <View className="min-w-0 flex-1">
          <Text className="block text-[29px] font-extrabold leading-[1.25] text-[#07112f]">我的班次</Text>
          <Text className="mt-[20px] block text-[36px] font-extrabold leading-[1.18] text-[#07112f]">
            {props.context?.shift.startTime ?? '09:00'} - {props.context?.shift.endTime ?? '18:00'}
            <Text className="text-[26px] font-semibold text-[#667085]"> （8小时）</Text>
          </Text>
          <Text className="mt-[18px] block text-[26px] leading-[1.3] text-[#667085]">
            {props.context?.attendanceGroup.name ?? '生产一组'} · {props.context?.shift.name ?? '上午班'}
          </Text>
        </View>
        <Chevron />
      </View>
    </HomeCard>
  );
}

function MonthlySummary() {
  return (
    <HomeCard>
      <Text className="block text-[30px] font-extrabold leading-[1.2] text-[#07112f]">本月摘要</Text>
      <View className="mt-[26px] grid grid-cols-4 gap-[8px]">
        <HomeMetric value="20" label="出勤天数" tone="primary" />
        <HomeMetric value="2" label="迟到次数" tone="warning" />
        <HomeMetric value="1" label="请假天数" tone="primary" />
        <HomeMetric value="160" label="工时(小时)" tone="muted" />
      </View>
    </HomeCard>
  );
}

function HomeCard(props: { children: React.ReactNode; className?: string }) {
  return (
    <View
      className={`box-border rounded-[28px] bg-white px-[28px] py-[30px] shadow-[0_22px_58px_rgba(25,35,76,0.07)] ${props.className ?? ''}`}
    >
      {props.children}
    </View>
  );
}

function HomeShortcutIcon(props: { icon: MiniIconComponent }) {
  const Icon = props.icon;

  return (
    <View className="mx-auto flex h-[72px] w-[72px] items-center justify-center rounded-[22px] bg-[#5b55ff] shadow-[0_16px_34px_rgba(91,85,255,0.22)]">
      <Icon color="#ffffff" size={34} strokeWidth={2} />
    </View>
  );
}

function HomeMetric(props: { value: string; label: string; tone: 'primary' | 'warning' | 'muted' }) {
  const valueColor = props.tone === 'warning' ? 'text-[#f97316]' : props.tone === 'muted' ? 'text-[#07112f]' : 'text-[#5b55ff]';

  return (
    <View className="flex flex-col items-center">
      <Text className={`block text-center text-[34px] font-extrabold leading-[1.12] ${valueColor}`}>
        {props.value}
      </Text>
      <Text className="mt-[14px] block text-center text-[22px] font-semibold leading-[1.2] text-[#667085]">
        {props.label}
      </Text>
    </View>
  );
}
