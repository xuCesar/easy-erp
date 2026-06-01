import { useMemo, useState } from 'react';
import { Text, View } from '@tarojs/components';
import { useDidShow } from '@tarojs/taro';
import type { ApprovalItem, ApprovalStatus } from '@easy-erp/shared-types';
import { CalendarDays, RotateCcw, Search } from 'lucide-react-taro';
import { createRuntimePages } from '../../services';
import { MiniButton, MiniCard, MiniEmpty, MiniEmptyNotice, MiniHeader, MiniIcon, MiniPage, MiniStatus } from '../../components';
import { RouteName } from '../../constants/routes';
import { useAuthGuard } from '../../hooks/useAuthGuard';
import { usePageNotice } from '../../hooks/usePageNotice';
import { navigateTo } from '../../router';
import { formatClock, formatShortDate } from '../../shared/utils/date';

type FilterKey = 'PENDING' | 'DONE';

export default function RequestsPage() {
  useAuthGuard();

  const [items, setItems] = useState<ApprovalItem[]>([]);
  const [filter, setFilter] = useState<FilterKey>('PENDING');
  const [isLoading, setIsLoading] = useState(true);
  const { notice, clearNotice, showError } = usePageNotice();

  useDidShow(() => {
    void loadRequests();
  });

  async function loadRequests() {
    setIsLoading(true);
    clearNotice();

    try {
      const nextItems = await createRuntimePages().requests.load();
      setItems(nextItems);
    } catch (error) {
      showError(error, '申请列表加载失败。', '无法读取申请');
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }

  const visibleItems = useMemo(() => {
    if (filter === 'PENDING') {
      return items.filter((item) => item.status === 'PENDING');
    }

    return items.filter((item) => item.status !== 'PENDING');
  }, [filter, items]);

  return (
    <MiniPage>
      <MiniHeader
        title="审批"
        right={<Search color="#07112f" size={30} strokeWidth={1.9} />}
      />

      <View className="mb-[26px] flex items-center justify-center border-b border-[#edf0f7]">
        <SegmentButton label="待处理" active={filter === 'PENDING'} onClick={() => setFilter('PENDING')} />
        <SegmentButton label="已处理" active={filter === 'DONE'} onClick={() => setFilter('DONE')} />
      </View>

      {isLoading ? (
        <MiniCard>
          <Text className="block text-[28px] font-bold text-[#667085]">正在同步申请列表...</Text>
        </MiniCard>
      ) : null}

      {notice ? (
        <MiniCard>
          <MiniEmptyNotice notice={notice} />
        </MiniCard>
      ) : null}

      {!isLoading && !notice && visibleItems.length === 0 ? (
        <MiniCard>
          <MiniEmpty
            title={items.length === 0 ? '暂无申请' : '当前分类暂无申请'}
            description={items.length === 0 ? '可以发起请假或补卡申请，提交后会显示在这里。' : '切换分类查看其他状态。'}
          />
          <View className="mt-[22px] grid grid-cols-2 gap-[16px]">
            <MiniButton variant="secondary" onClick={() => navigateTo(RouteName.LEAVE_REQUEST)}>请假</MiniButton>
            <MiniButton variant="secondary" onClick={() => navigateTo(RouteName.REPAIR_REQUEST)}>补卡</MiniButton>
          </View>
        </MiniCard>
      ) : null}

      <View className="grid gap-[22px]">
        {visibleItems.map((item) => (
          <RequestCard key={`${item.type}:${item.id}`} item={item} />
        ))}
      </View>
    </MiniPage>
  );
}

function SegmentButton(props: { label: string; active: boolean; onClick: () => void }) {
  return (
    <View className="relative flex-1 items-center pb-[20px]" onClick={props.onClick}>
      <Text className={`block text-center text-[30px] font-extrabold ${props.active ? 'text-[#4f46f5]' : 'text-[#667085]'}`}>
        {props.label}
      </Text>
      {props.active ? <View className="absolute bottom-[-2px] left-1/2 h-[6px] w-[90px] -translate-x-1/2 rounded-full bg-[#5b55ff]" /> : null}
    </View>
  );
}

function RequestCard(props: { item: ApprovalItem }) {
  const item = props.item;
  const TypeIcon = item.type === 'LEAVE' ? CalendarDays : RotateCcw;

  return (
    <MiniCard className="px-[30px] py-[28px]">
      <View className="flex items-start gap-[22px]">
        <MiniIcon icon={TypeIcon} tone={item.type === 'LEAVE' ? 'primary' : 'warning'} />
        <View className="min-w-0 flex-1">
          <Text className="block text-[31px] font-extrabold text-[#07112f]">{item.employeeName}</Text>
          <Text className="mt-[8px] block text-[28px] font-semibold text-[#07112f]">
            {item.type === 'LEAVE' ? '请假申请' : '补卡申请'}
          </Text>
          <Text className="mt-[18px] block text-[27px] text-[#667085]">{requestTimeText(item)}</Text>
        </View>
        <MiniStatus tone={statusTone(item.status)}>{statusLabel(item.status)}</MiniStatus>
      </View>
    </MiniCard>
  );
}

function statusLabel(status: ApprovalStatus): string {
  const labels: Record<ApprovalStatus, string> = {
    PENDING: '待审批',
    APPROVED: '已审批',
    REJECTED: '已驳回',
  };

  return labels[status];
}

function statusTone(status: ApprovalStatus): 'primary' | 'warning' | 'danger' {
  if (status === 'APPROVED') {
    return 'primary';
  }

  if (status === 'REJECTED') {
    return 'danger';
  }

  return 'warning';
}

function requestTimeText(item: ApprovalItem): string {
  if (item.type === 'LEAVE') {
    return `${formatShortDate(item.startAt)} · ${durationText(item.startAt, item.endAt)}`;
  }

  return `${formatShortDate(item.targetDate)} · ${formatClock(item.repairAt)}`;
}

function durationText(startAt: string | undefined, endAt: string | undefined): string {
  if (!startAt || !endAt) {
    return '-';
  }

  const hours = Math.max(1, Math.round((Date.parse(endAt) - Date.parse(startAt)) / 3600000));
  return hours >= 8 ? `${Math.round(hours / 8)}天` : `${hours}小时`;
}
