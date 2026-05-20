import { useState } from 'react';
import type { LoginRequest } from '@easy-erp/shared-types';
import { Badge } from './shadcn/badge';
import { Button } from './shadcn/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './shadcn/card';
import { Input } from './shadcn/input';
import { cn } from '../lib/utils';
import { toAdminFeedback } from '../pages/common';
import type { AdminSession } from '../api/client';

export function SessionPanel(props: {
  session: AdminSession | null;
  form: LoginRequest;
  isLoading: boolean;
  onFormChange: (form: LoginRequest) => void;
  onLogin: () => void;
  onLogout: () => void;
}) {
  if (props.session) {
    return (
      <Card className="border-white/15 bg-white/12 text-primary-foreground shadow-2xl backdrop-blur-xl">
        <CardHeader className="pb-3">
          <Badge className="w-fit bg-success text-success-foreground">已登录</Badge>
          <CardTitle className="text-xl">{props.session.roles.join(' / ')}</CardTitle>
          <CardDescription className="break-all text-primary-foreground/72">
            Tenant: {props.session.tenantId}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full bg-white text-primary hover:bg-white/90" onClick={props.onLogout}>
            退出登录
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-white/15 bg-white/12 text-primary-foreground shadow-2xl backdrop-blur-xl">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl">试点登录</CardTitle>
        <CardDescription className="text-primary-foreground/72">
          使用 demo 管理员账号进入驾驶舱。
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <Input
          className="border-white/20 bg-white/90"
          value={props.form.phone}
          placeholder="手机号"
          onChange={(event) => props.onFormChange({ ...props.form, phone: event.target.value })}
        />
        <Input
          className="border-white/20 bg-white/90"
          type="password"
          value={props.form.password}
          placeholder="密码"
          onChange={(event) => props.onFormChange({ ...props.form, password: event.target.value })}
        />
        <Button disabled={props.isLoading} onClick={props.onLogin}>
          登录驾驶舱
        </Button>
      </CardContent>
    </Card>
  );
}

export function CrudSection(props: {
  title: string;
  description?: string;
  canManage: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card className="overflow-hidden border-border/80 bg-card/95 shadow-[0_24px_70px_rgba(26,45,36,0.10)]">
      <CardHeader className="border-b border-border/70 bg-gradient-to-r from-white to-muted/60">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>{props.title}</CardTitle>
            <CardDescription className="mt-2">
              {props.description ?? '保持试点数据可读、可排障、可演示。'}
            </CardDescription>
          </div>
          <Badge variant={props.canManage ? 'success' : 'warning'} className="w-fit">
            {props.canManage ? '可管理' : '只读 / 权限受限'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-5 sm:p-6">{props.children}</CardContent>
    </Card>
  );
}

export function InlineForm(props: {
  disabled: boolean;
  children: React.ReactNode;
  submitText?: string;
  onSubmit: () => Promise<void>;
}) {
  const [error, setError] = useState('');

  async function submit() {
    setError('');
    try {
      await props.onSubmit();
    } catch (innerError) {
      setError(toAdminFeedback(innerError).message);
    }
  }

  return (
    <div className="mb-5 grid gap-3 rounded-3xl border border-border/70 bg-muted/35 p-4 lg:grid-cols-4">
      {props.children}
      <Button disabled={props.disabled} onClick={submit}>
        {props.submitText ?? '新建'}
      </Button>
      {error && (
        <span className="rounded-2xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive lg:col-span-4">
          {error}
        </span>
      )}
    </div>
  );
}

export function DataTable<TItem>(props: {
  rows: TItem[];
  emptyText: string;
  columns: Array<[string, (row: TItem) => React.ReactNode]>;
}) {
  if (props.rows.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-border bg-muted/40 p-8 text-sm text-muted-foreground">
        {props.emptyText}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] border-collapse text-sm">
          <thead>
            <tr className="bg-muted/70 text-left text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {props.columns.map(([label]) => (
                <th key={label} className="border-b border-border px-4 py-3 font-semibold">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {props.rows.map((row, index) => (
              <tr key={index} className="transition-colors hover:bg-muted/35">
                {props.columns.map(([label, render]) => (
                  <td key={label} className="border-b border-border/70 px-4 py-3 text-foreground">
                    {render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function FormInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <Input {...props} />;
}

export function ActionPanel(props: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'mb-5 grid gap-3 rounded-3xl border border-border/70 bg-muted/35 p-4 lg:grid-cols-4',
        props.className,
      )}
    >
      {props.children}
    </div>
  );
}
