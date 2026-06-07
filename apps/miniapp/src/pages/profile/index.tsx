import { useEffect, useState } from 'react';
import { Text, View } from '@tarojs/components';
import type { EmployeeProfileSummary } from '@easy-erp/shared-types';
import {
  Bell,
  Building2,
  CalendarDays,
  CircleQuestionMark,
  ClipboardList,
  LogOut,
  Settings,
} from 'lucide-react-taro';
import { clearSession, loadSession } from '../../api';
import { createRuntimeServices } from '../../services';
import { Chevron, MetricStat, MiniButton, MiniCard, MiniEmptyNotice, MiniHeader, MiniIcon, MiniPage, MiniSectionTitle, type MiniIconComponent } from '../../components';
import { RouteName } from '../../constants/routes';
import { toastInfo } from '../../feedback';
import { useAuthGuard } from '../../hooks/useAuthGuard';
import { usePageNotice } from '../../hooks/usePageNotice';
import { navigateTo, reLaunch, switchTab } from '../../router';

export default function ProfilePage() {
  useAuthGuard();

  const [summary, setSummary] = useState<EmployeeProfileSummary | null>(null);
  const { notice, clearNotice, showError, showMuted } = usePageNotice({
    tone: 'muted',
    title: '正在加载',
    message: '正在读取个人信息...',
  });
  const session = loadSession();

  useEffect(() => {
    void loadProfile();
  }, []);

  async function loadProfile() {
    showMuted('正在读取个人信息...', '正在加载');

    try {
      const result = await createRuntimeServices().profile.load();
      setSummary(result);
      clearNotice();
    } catch (error) {
      showError(error, '读取个人信息失败。', '读取失败');
    }
  }

  const employee = summary?.employee ?? null;

  return (
    <MiniPage>
      <MiniHeader title="我的" />

      <View className="mb-[24px] rounded-[28px] bg-[#8b86ff] px-[28px] py-[30px] shadow-[0_20px_50px_rgba(91,85,255,0.24)]">
        <View className="flex items-center gap-[26px]">
          <View className="flex h-[118px] w-[118px] items-center justify-center rounded-full bg-white/90">
            <Text className="text-[42px] font-extrabold text-[#4f46f5]">{employee?.name.slice(0, 1) ?? '我'}</Text>
          </View>
          <View className="min-w-0 flex-1">
            <Text className="block text-[42px] font-extrabold text-white">{employee?.name ?? '未绑定员工'}</Text>
            <Text className="mt-[8px] block text-[27px] font-semibold text-white/85">
              {employee?.empNo ? `工号 ${employee.empNo}` : '请联系管理员绑定档案'}
            </Text>
          </View>
          <View className="shrink-0 rounded-full bg-white px-[22px] py-[12px]">
            <Text className="whitespace-nowrap text-[25px] font-extrabold text-[#4f46f5]">个人信息</Text>
          </View>
        </View>
      </View>

      <MiniCard className="mb-[24px]">
        <View className="flex items-center gap-[20px]">
          <MiniIcon icon={Building2} tone="primary" />
          <View className="min-w-0 flex-1">
            <Text className="block truncate text-[31px] font-extrabold text-[#07112f]">示例科技有限公司</Text>
            <Text className="mt-[6px] block truncate text-[23px] text-[#667085]">租户 {session?.tenantId ?? summary?.user.tenantId ?? '-'}</Text>
          </View>
          <Chevron />
        </View>
      </MiniCard>

      <MiniCard className="mb-[24px]">
        <MiniSectionTitle title="本月概览" />
        <View className="grid grid-cols-3">
          <MetricStat value="20" label="出勤天数" tone="primary" valueClassName="text-[39px]" labelClassName="mt-[10px] text-[24px]" />
          <MetricStat value="2" label="迟到次数" tone="warning" valueClassName="text-[39px]" labelClassName="mt-[10px] text-[24px]" />
          <MetricStat value="160" label="工时(小时)" tone="muted" valueClassName="text-[39px]" labelClassName="mt-[10px] text-[24px]" />
        </View>
      </MiniCard>

      <MiniCard className="mb-[24px] px-[24px] py-[10px]">
        <MenuRow icon={ClipboardList} label="考勤记录" onClick={() => navigateTo(RouteName.ATTENDANCE_RECORDS)} />
        <MenuRow icon={CalendarDays} label="请假管理" onClick={() => switchTab(RouteName.REQUESTS)} />
        <MenuRow icon={Bell} label="消息通知" onClick={() => toastInfo('消息通知待接入')} />
        <MenuRow icon={Settings} label="设置" onClick={() => toastInfo('设置待接入')} />
        <MenuRow icon={CircleQuestionMark} label="帮助与反馈" onClick={() => toastInfo('帮助与反馈待接入')} />
      </MiniCard>

      {notice ? (
        <MiniCard className="mb-[24px]">
          <MiniEmptyNotice notice={notice} />
        </MiniCard>
      ) : null}

      <MiniButton
        variant="secondary"
        onClick={() => {
          clearSession();
          reLaunch(RouteName.LOGIN);
        }}
      >
        <View className="flex items-center justify-center gap-[12px]">
          <LogOut color="#4f46f5" size={24} strokeWidth={1.9} />
          <Text>退出登录</Text>
        </View>
      </MiniButton>
    </MiniPage>
  );
}

function MenuRow(props: { icon: MiniIconComponent; label: string; onClick: () => void }) {
  return (
    <View className="flex items-center gap-[22px] border-b border-[#edf0f7] py-[24px] last:border-b-0" onClick={props.onClick}>
      <MiniIcon icon={props.icon} tone="muted" />
      <Text className="min-w-0 flex-1 text-[30px] font-bold text-[#07112f]">{props.label}</Text>
      <Chevron />
    </View>
  );
}
