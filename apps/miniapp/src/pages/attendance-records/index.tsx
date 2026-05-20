import { useEffect, useState } from 'react';
import type { AttendanceResultRow } from '@easy-erp/shared-types';
import { createRuntimePages } from '../../services';
import {
  Card,
  ItemMeta,
  ItemTitle,
  ListItem,
  PageShell,
  StatusBadge,
  StatusText,
} from '../../ui';

export default function AttendanceRecordsPage() {
  const [rows, setRows] = useState<AttendanceResultRow[]>([]);
  const [status, setStatus] = useState('正在读取本月考勤记录...');

  useEffect(() => {
    void loadRecords();
  }, []);

  async function loadRecords() {
    const now = new Date();
    const startDate = `${now.toISOString().slice(0, 7)}-01`;
    const endDate = now.toISOString().slice(0, 10);

    try {
      const result = await createRuntimePages().records.search({ startDate, endDate, page: 1, pageSize: 31 });
      setRows(result.items);
      setStatus(result.items.length > 0 ? '考勤记录已加载。' : '暂无本月考勤记录。');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '读取考勤记录失败。');
    }
  }

  return (
    <PageShell title="考勤记录" subtitle="展示员工本月考勤结果，月报锁定后普通流程不可静默修改。">
      <Card>
        {rows.map((row) => (
          <ListItem key={row.id}>
            <ItemTitle>{row.date}</ItemTitle>
            <StatusBadge tone={statusTone(row.primaryStatus)}>{row.primaryStatus}</StatusBadge>
            <ItemMeta>上班：{row.clockInAt ?? '-'}</ItemMeta>
            <ItemMeta>下班：{row.clockOutAt ?? '-'}</ItemMeta>
            <ItemMeta>锁定：{row.isFinalized ? '是' : '否'}</ItemMeta>
          </ListItem>
        ))}
        {rows.length === 0 && <StatusText tone={status.includes('失败') ? 'danger' : 'info'}>{status}</StatusText>}
      </Card>
      <StatusText tone={status.includes('失败') ? 'danger' : rows.length > 0 ? 'success' : 'info'}>{status}</StatusText>
    </PageShell>
  );
}

function statusTone(status: string): 'success' | 'warning' | 'danger' {
  if (status === 'NORMAL') {
    return 'success';
  }

  if (status === 'ABSENT') {
    return 'danger';
  }

  return 'warning';
}
