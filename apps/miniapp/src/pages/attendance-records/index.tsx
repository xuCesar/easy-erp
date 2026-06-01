import { useEffect, useState } from 'react';
import { Text, View } from '@tarojs/components';
import type { AttendanceResultRow } from '@easy-erp/shared-types';
import { createRuntimePages } from '../../services';
import { MetricStat, MiniCard, MiniEmptyNotice, MiniHeader, MiniPage, MiniStatus } from '../../components';
import { useAuthGuard } from '../../hooks/useAuthGuard';
import { usePageNotice } from '../../hooks/usePageNotice';
import { currentMonthDateRange } from '../../shared/utils/date';

export default function AttendanceRecordsPage() {
  useAuthGuard();

  const [rows, setRows] = useState<AttendanceResultRow[]>([]);
  const { notice, clearNotice, showError, showMuted } = usePageNotice({
    tone: 'muted',
    title: '正在加载',
    message: '正在读取本月考勤记录...',
  });

  useEffect(() => {
    void loadRecords();
  }, []);

  async function loadRecords() {
    const { startDate, endDate } = currentMonthDateRange();
    showMuted('正在读取本月考勤记录...', '正在加载');

    try {
      const result = await createRuntimePages().records.search({ startDate, endDate, page: 1, pageSize: 31 });
      setRows(result.items);
      if (result.items.length > 0) {
        clearNotice();
        return;
      }

      showMuted('当前月份还没有考勤记录。', '暂无记录');
    } catch (error) {
      showError(error, '读取考勤记录失败。', '读取失败');
    }
  }

  return (
    <MiniPage compact>
      <MiniHeader title="考勤记录" subtitle="按日期查看本月打卡结论和异常状态。" back />

      <MiniCard className="mb-[24px]">
        <View className="grid grid-cols-3">
          <MetricStat value={String(rows.length)} label="全部记录" tone="primary" />
          <MetricStat value={String(rows.filter((row) => row.primaryStatus !== 'NORMAL').length)} label="异常记录" tone="warning" />
          <MetricStat value={String(rows.filter((row) => row.isFinalized).length)} label="已锁定" tone="muted" />
        </View>
      </MiniCard>

      {notice ? (
        <MiniCard className="mb-[24px]">
          <MiniEmptyNotice notice={notice} />
        </MiniCard>
      ) : null}

      <View className="grid gap-[18px]">
        {orderedRows(rows).map((row) => (
          <MiniCard key={row.id} className="py-[24px]">
            <View className="flex items-center justify-between gap-[20px]">
              <View className="min-w-0 flex-1">
                <Text className="block text-[30px] font-extrabold text-[#07112f]">{row.date}</Text>
                <Text className="mt-[8px] block text-[25px] text-[#667085]">
                  上班 {row.clockInAt ?? '-'} · 下班 {row.clockOutAt ?? '-'}
                </Text>
              </View>
              <MiniStatus tone={statusTone(row.primaryStatus)}>{statusLabel(row.primaryStatus)}</MiniStatus>
            </View>
          </MiniCard>
        ))}
      </View>
    </MiniPage>
  );
}

function orderedRows(rows: AttendanceResultRow[]): AttendanceResultRow[] {
  return [...rows].sort((left, right) => {
    const leftRisk = left.primaryStatus === 'NORMAL' ? 1 : 0;
    const rightRisk = right.primaryStatus === 'NORMAL' ? 1 : 0;
    return leftRisk - rightRisk;
  });
}

function statusTone(status: string): 'primary' | 'success' | 'warning' | 'danger' {
  if (status === 'NORMAL') {
    return 'success';
  }

  if (status === 'ABSENT') {
    return 'danger';
  }

  if (status === 'LEAVE') {
    return 'primary';
  }

  return 'warning';
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    NORMAL: '正常',
    LATE: '迟到',
    EARLY_LEAVE: '早退',
    ABSENT: '缺勤',
    LEAVE: '请假',
    MISSING_CLOCK: '缺卡',
  };

  return labels[status] ?? status;
}
