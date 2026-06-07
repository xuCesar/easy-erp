import { useState } from 'react';
import Taro from '@tarojs/taro';
import type { LoginRequest } from '@easy-erp/shared-types';
import { createSession, saveSession } from '../../api';
import { createRuntimeServices } from '../../services';
import { RouteName } from '../../constants/routes';
import { switchTab } from '../../router';
import { getErrorMessage } from '../../api';

export type LoginMethod = 'account' | 'sms';
export type SubmitAction = LoginMethod | 'wechat';
export type LoginStatusTone = 'info' | 'success' | 'danger';
export type LoginStatus = {
  message: string;
  tone: LoginStatusTone;
};
export type SmsLoginForm = {
  phone: string;
  code: string;
};

export function useLoginController() {
  const [accountForm, setAccountForm] = useState<LoginRequest>({ phone: '', password: '' });
  const [smsForm, setSmsForm] = useState<SmsLoginForm>({ phone: '', code: '' });
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('account');
  const [status, setStatus] = useState<LoginStatus | null>(null);
  const [hasAgreed, setHasAgreed] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [submittingAction, setSubmittingAction] = useState<SubmitAction | null>(null);

  const isBusy = submittingAction !== null;
  const primaryButtonLabel =
    submittingAction === 'account' || submittingAction === 'sms' ? '登录中...' : '登录';

  function showStatus(tone: LoginStatusTone, message: string) {
    setStatus({ message, tone });
  }

  function validateAgreement() {
    if (hasAgreed) {
      return true;
    }

    showStatus('danger', '请先阅读并同意用户协议和隐私政策。');
    return false;
  }

  async function submitAccountLogin() {
    const request: LoginRequest = {
      phone: accountForm.phone.trim(),
      password: accountForm.password,
    };

    if (!request.phone || !request.password) {
      showStatus('danger', '请输入账号 / 手机号和密码。');
      return;
    }

    if (!validateAgreement()) {
      return;
    }

    setSubmittingAction('account');
    showStatus('info', '正在登录...');

    try {
      const result = await createRuntimeServices().auth.submit(request);
      saveSession(createSession(result));
      showStatus('success', '登录成功。');
      await switchTab(RouteName.HOME);
    } catch (error) {
      showStatus('danger', getErrorMessage(error, '登录失败，请稍后重试。'));
    } finally {
      setSubmittingAction(null);
    }
  }

  async function submitWechatLogin() {
    if (!validateAgreement()) {
      return;
    }

    setSubmittingAction('wechat');
    showStatus('info', '正在拉起微信登录...');

    try {
      const result = await Taro.login();

      if (!result.code) {
        throw new Error('微信未返回登录凭证。');
      }

      showStatus('success', '已获取微信登录凭证，后台接口接入后可完成一键登录。');
    } catch (error) {
      showStatus(
        'danger',
        getErrorMessage(error, '微信登录暂不可用，请使用手机号登录。'),
      );
    } finally {
      setSubmittingAction(null);
    }
  }

  function submitSmsLogin() {
    const request = {
      code: smsForm.code.trim(),
      phone: smsForm.phone.trim(),
    };

    if (!request.phone || !request.code) {
      showStatus('danger', '请输入手机号和短信验证码。');
      return;
    }

    if (!validateAgreement()) {
      return;
    }

    // 短信登录尚未接入后端接口，保留显式提示，避免用户误判为已成功提交。
    showStatus('danger', '短信登录接口暂未接入，请先使用账号密码登录。');
  }

  function submitPrimaryAction() {
    if (loginMethod === 'sms') {
      submitSmsLogin();
      return;
    }

    void submitAccountLogin();
  }

  return {
    accountForm,
    hasAgreed,
    isBusy,
    loginMethod,
    primaryButtonLabel,
    showPassword,
    smsForm,
    status,
    submittingAction,
    setAccountForm,
    setHasAgreed,
    setLoginMethod,
    setShowPassword,
    setSmsForm,
    submitPrimaryAction,
    submitWechatLogin,
  };
}
