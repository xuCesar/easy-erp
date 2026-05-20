import { useEffect, useState } from 'react';
import type { EmployeeProfileSummary } from '../profile';
import { createRuntimePages } from '../../services';
import { clearSession, loadSession } from '../../api/client';
import { Card, ItemMeta, ItemTitle, ListItem, PageShell, PrimaryButton, StatusText } from '../../ui';

export default function ProfilePage() {
  const [summary, setSummary] = useState<EmployeeProfileSummary | null>(null);
  const [status, setStatus] = useState('正在读取个人信息...');
  const session = loadSession();

  useEffect(() => {
    void loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const result = await createRuntimePages().profile.load();
      setSummary(result);
      setStatus('个人信息已加载。');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '读取个人信息失败。');
    }
  }

  return (
    <PageShell title="个人信息" subtitle="账号身份与员工档案分离，登录账号不直接等同员工业务档案。">
      <Card>
        <ListItem>
          <ItemTitle>Tenant: {session?.tenantId ?? summary?.user.tenantId ?? '-'}</ItemTitle>
          <ItemMeta>角色：{session?.roles.join(', ') ?? summary?.user.roles.join(', ') ?? '-'}</ItemMeta>
          <ItemMeta>员工：{summary?.employee?.name ?? '未绑定员工档案'}</ItemMeta>
        </ListItem>
        <PrimaryButton variant="danger" onClick={() => { clearSession(); setStatus('已退出登录。'); }}>退出登录</PrimaryButton>
      </Card>
      <StatusText tone={status.includes('失败') ? 'danger' : status.includes('已加载') ? 'success' : 'info'}>{status}</StatusText>
    </PageShell>
  );
}
