import { useEffect, useMemo, useState } from 'react';
import { Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import type { CheckinContext, EmployeeProfileSummary } from '@easy-erp/shared-types';
import {
  CalendarDays,
  CircleCheckBig,
  ClipboardCheck,
  Navigation,
  RotateCcw,
  Search,
} from 'lucide-react-taro';
import { createRuntimePages } from '../../services';
import {
  Chevron,
  MiniCard,
  MiniEmpty,
  MiniHeader,
  MiniIcon,
  MiniPage,
  MiniSectionTitle,
  MiniStatus,
  MetricStat,
  type MiniIconComponent,
} from '../../components';
import { RouteName } from '../../constants/routes';
import { useAuthGuard } from '../../hooks/useAuthGuard';
import { navigateTo } from '../../router';
import { formatWeekdayDate } from '../../shared/utils/date';
import { getErrorMessage } from '../../shared/utils/error';

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
      const pages = createRuntimePages();
      const profile = await pages.profile.load();
      const checkin = profile.employee ? await pages.checkin.loadContext() : null;
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
      <MiniHeader
        title="工作台"
        right={<Search color="#07112f" size={30} strokeWidth={1.9} />}
      />

      <View className="mb-[30px]">
        <Text className="block text-[38px] font-extrabold text-[#07112f]">
          你好，{employee?.name ?? '员工'}
        </Text>
        <Text className="mt-[8px] block text-[27px] text-[#667085]">今天是 {todayText}</Text>
      </View>

      {state.isLoading ? (
        <MiniCard className="mb-[24px]">
          <Text className="block text-[28px] font-bold text-[#667085]">正在同步今日考勤状态...</Text>
        </MiniCard>
      ) : null}

      {state.error ? (
        <MiniCard className="mb-[24px]">
          <MiniEmpty title="加载失败" description={state.error} />
        </MiniCard>
      ) : null}

      {!state.isLoading && !employee ? (
        <MiniCard className="mb-[24px]">
          <MiniEmpty title="未绑定员工档案" description="当前账号还没有员工档案，打卡和申请暂不可用。" />
        </MiniCard>
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
    <MiniCard className="mb-[26px]" >
      <Text className="block text-[26px] font-bold text-[#667085]">今日考勤状态</Text>
      <View
        className="mt-[28px] flex items-center gap-[28px]"
        onClick={() => navigateTo(RouteName.CHECKIN)}
      >
        <View className="flex h-[86px] w-[86px] items-center justify-center rounded-full bg-[#5b55ff] shadow-[0_16px_38px_rgba(91,85,255,0.28)]">
          <CircleCheckBig color="#ffffff" size={40} strokeWidth={2.1} />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="block text-[42px] font-extrabold text-[#07112f]">
            {completed ? '已打卡' : nextAction === 'CLOCK_OUT' ? '待下班打卡' : '待上班打卡'}
          </Text>
          <Text className="mt-[8px] block text-[28px] text-[#667085]">
            上班 {clockInAt ?? '--:--'}
          </Text>
        </View>
        <Chevron />
      </View>
    </MiniCard>
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
    <View className="mb-[32px] grid grid-cols-4 gap-[18px]">
      {shortcuts.map((item) => (
        <View
          key={item.title}
          className="items-center"
          onClick={() => {
            if (item.routeName) {
              navigateTo(item.routeName);
              return;
            }

            Taro.showToast({ title: '外出申请待接入', icon: 'none' });
          }}
        >
          <View className="mx-auto">
            <MiniIcon icon={item.icon} />
          </View>
          <Text className="mt-[14px] block text-center text-[26px] font-bold text-[#07112f]">{item.title}</Text>
        </View>
      ))}
    </View>
  );
}

function ShiftCard(props: { context: CheckinContext | null }) {
  return (
    <MiniCard className="mb-[26px]" >
      <View className="flex items-center justify-between gap-[20px]">
        <View>
          <Text className="block text-[27px] font-bold text-[#07112f]">我的班次</Text>
          <Text className="mt-[22px] block text-[33px] font-extrabold text-[#07112f]">
            {props.context?.shift.startTime ?? '09:00'} - {props.context?.shift.endTime ?? '18:00'}
            <Text className="text-[25px] font-medium text-[#667085]"> （8小时）</Text>
          </Text>
          <Text className="mt-[18px] block text-[26px] text-[#667085]">
            {props.context?.attendanceGroup.name ?? '生产一组'} · {props.context?.shift.name ?? '上午班'}
          </Text>
        </View>
        <Chevron />
      </View>
    </MiniCard>
  );
}

function MonthlySummary() {
  return (
    <MiniCard>
      <MiniSectionTitle title="本月摘要" />
      <View className="grid grid-cols-4 gap-[8px]">
        <MetricStat value="20" label="出勤天数" tone="primary" valueClassName="text-[34px]" labelClassName="text-[22px]" />
        <MetricStat value="2" label="迟到次数" tone="warning" valueClassName="text-[34px]" labelClassName="text-[22px]" />
        <MetricStat value="1" label="请假天数" tone="primary" valueClassName="text-[34px]" labelClassName="text-[22px]" />
        <MetricStat value="160" label="工时(小时)" tone="muted" valueClassName="text-[34px]" labelClassName="text-[22px]" />
      </View>
    </MiniCard>
  );
}
