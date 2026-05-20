import { useState } from 'react';
import Taro from '@tarojs/taro';
import type { LoginRequest } from '@easy-erp/shared-types';
import { createRuntimePages } from '../../services';
import { createSession, saveSession } from '../../api/client';
import { Card, Field, PageShell, PrimaryButton, StatusText } from '../../ui';

export default function LoginPage() {
  const [form, setForm] = useState<LoginRequest>({ phone: '', password: '' });
  const [status, setStatus] = useState('请输入账号密码登录。');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit() {
    setIsSubmitting(true);
    setStatus('正在登录...');

    try {
      const result = await createRuntimePages().login.submit(form);
      saveSession(createSession(result));
      setStatus('登录成功。');
      await Taro.navigateTo({ url: '/pages/checkin/index' });
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '登录失败，请稍后重试。');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <PageShell title="员工登录" subtitle="使用手机号登录后，可进行打卡、请假、补卡和记录查询。">
      <Card>
        <Field label="手机号" value={form.phone} placeholder="13800000000" onInput={(phone) => setForm({ ...form, phone })} />
        <Field label="密码" value={form.password} placeholder="请输入密码" password onInput={(password) => setForm({ ...form, password })} />
        <PrimaryButton disabled={isSubmitting} onClick={submit}>登录</PrimaryButton>
      </Card>
      <StatusText tone={status.includes('失败') ? 'danger' : status.includes('成功') ? 'success' : 'info'}>{status}</StatusText>
    </PageShell>
  );
}
