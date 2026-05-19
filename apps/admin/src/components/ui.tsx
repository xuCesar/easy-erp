import { useState } from 'react';
import type { LoginRequest } from '@easy-erp/shared-types';
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
      <aside className="sessionCard">
        <span>已登录</span>
        <strong>{props.session.roles.join(' / ')}</strong>
        <small>Tenant: {props.session.tenantId}</small>
        <button onClick={props.onLogout}>退出</button>
      </aside>
    );
  }

  return (
    <aside className="sessionCard">
      <input
        value={props.form.phone}
        placeholder="手机号"
        onChange={(event) => props.onFormChange({ ...props.form, phone: event.target.value })}
      />
      <input
        type="password"
        value={props.form.password}
        placeholder="密码"
        onChange={(event) => props.onFormChange({ ...props.form, password: event.target.value })}
      />
      <button disabled={props.isLoading} onClick={props.onLogin}>
        登录
      </button>
    </aside>
  );
}

export function CrudSection(props: {
  title: string;
  canManage: boolean;
  children: React.ReactNode;
}) {
  return (
    <article className="card">
      <div className="cardHeader">
        <h2>{props.title}</h2>
        <span className={props.canManage ? 'badge good' : 'badge muted'}>
          {props.canManage ? '可管理' : '只读 / 权限受限'}
        </span>
      </div>
      {props.children}
    </article>
  );
}

export function InlineForm(props: {
  disabled: boolean;
  children: React.ReactNode;
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
    <div className="inlineForm">
      {props.children}
      <button disabled={props.disabled} onClick={submit}>新建</button>
      {error && <span className="formError">{error}</span>}
    </div>
  );
}

export function DataTable<TItem>(props: {
  rows: TItem[];
  emptyText: string;
  columns: Array<[string, (row: TItem) => React.ReactNode]>;
}) {
  if (props.rows.length === 0) {
    return <div className="empty">{props.emptyText}</div>;
  }

  return (
    <div className="tableWrap">
      <table>
        <thead>
          <tr>
            {props.columns.map(([label]) => <th key={label}>{label}</th>)}
          </tr>
        </thead>
        <tbody>
          {props.rows.map((row, index) => (
            <tr key={index}>
              {props.columns.map(([label, render]) => <td key={label}>{render(row)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
