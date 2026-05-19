import { useEffect, useState } from 'react';
import { Text, View } from '@tarojs/components';
import type { AttendanceResultRow } from '@easy-erp/shared-types';
import { createRuntimePages } from '../../services';
import { Card, PageShell, StatusText } from '../../ui';

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
          <View className="listItem" key={row.id}>
            <Text className="itemTitle">{row.date} · {row.primaryStatus}</Text>
            <Text className="itemMeta">上班：{row.clockInAt ?? '-'}</Text>
            <Text className="itemMeta">下班：{row.clockOutAt ?? '-'}</Text>
            <Text className="itemMeta">锁定：{row.isFinalized ? '是' : '否'}</Text>
          </View>
        ))}
        {rows.length === 0 && <StatusText>{status}</StatusText>}
      </Card>
      <StatusText>{status}</StatusText>
    </PageShell>
  );
}
