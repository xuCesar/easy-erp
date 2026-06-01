import {
  AccountLoginFields,
  AccountModeShortcut,
  AgreementToggle,
  CompanySelector,
  LoginDivider,
  LoginHero,
  LoginMethodTabs,
  LoginPageShell,
  LoginStatusMessage,
  LoginSubmitButton,
  SmsLoginFields,
  WechatLoginButton,
} from './components';
import { useLoginController } from './use-login-controller';

export default function LoginPage() {
  const controller = useLoginController();

  return (
    <LoginPageShell>
      <LoginHero />
      <LoginMethodTabs value={controller.loginMethod} onChange={controller.setLoginMethod} />
      <CompanySelector />

      <AccountLoginFields
        form={controller.accountForm}
        isVisible={controller.loginMethod === 'account'}
        showPassword={controller.showPassword}
        onChange={controller.setAccountForm}
        onTogglePassword={() => controller.setShowPassword((visible) => !visible)}
      />

      <SmsLoginFields
        form={controller.smsForm}
        isVisible={controller.loginMethod === 'sms'}
        onChange={controller.setSmsForm}
      />

      <LoginSubmitButton disabled={controller.isBusy} onClick={controller.submitPrimaryAction}>
        {controller.primaryButtonLabel}
      </LoginSubmitButton>

      <LoginDivider />

      <WechatLoginButton
        disabled={controller.isBusy}
        isSubmitting={controller.submittingAction === 'wechat'}
        onClick={() => void controller.submitWechatLogin()}
      />

      {controller.status ? <LoginStatusMessage status={controller.status} /> : null}

      <AgreementToggle
        checked={controller.hasAgreed}
        onToggle={() => controller.setHasAgreed((agreed) => !agreed)}
      />

      <AccountModeShortcut
        isVisible={controller.loginMethod === 'sms'}
        onClick={() => controller.setLoginMethod('account')}
      />
    </LoginPageShell>
  );
}
