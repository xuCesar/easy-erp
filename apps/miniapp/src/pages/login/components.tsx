import type { ComponentType, ReactNode } from 'react';
import { Button, Input, Text, View } from '@tarojs/components';
import type { LoginRequest } from '@easy-erp/shared-types';
import {
  Building2,
  Check,
  ChevronDown,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  MessageCircle,
  UserRound,
} from 'lucide-react-taro';
import type { IconProps } from 'lucide-react-taro';
import type { LoginMethod, LoginStatus, LoginStatusTone, SmsLoginForm } from './useLoginController';

type LoginIconComponent = ComponentType<IconProps>;

const panelBackgroundClass =
  '[background:radial-gradient(circle_at_14%_10%,rgba(82,104,255,0.07),transparent_28%),radial-gradient(circle_at_86%_34%,rgba(82,104,255,0.05),transparent_28%),#ffffff]';

const primaryGradientClass =
  '[background:linear-gradient(135deg,#7468ff_0%,#4f46f5_55%,#3f36ea_100%)]';

const loginMethodOptions: Array<{
  label: string;
  underlineWidthClass: string;
  value: LoginMethod;
}> = [
  { label: '账号密码登录', underlineWidthClass: 'w-[132px]', value: 'account' },
  { label: '短信登录', underlineWidthClass: 'w-[104px]', value: 'sms' },
];

const statusToneClass: Record<LoginStatusTone, string> = {
  danger: 'border-[#ffd7d2] bg-[#fff4f2] text-[#b42318]',
  info: 'border-[#dbe1ff] bg-[#f7f8ff] text-[#4f46e5]',
  success: 'border-[#c9f0df] bg-[#effcf7] text-[#0f8c6e]',
};

export function LoginPageShell(props: { children: ReactNode }) {
  return (
    <View
      className={`box-border min-h-screen px-[48px] pb-[42px] pt-[118px] text-[#08112f] ${panelBackgroundClass}`}
    >
      {props.children}
    </View>
  );
}

export function LoginHero() {
  return (
    <View className="mb-[54px]">
      <Text className="block text-[58px] font-extrabold leading-[1.38] text-[#08112f]">
        欢迎使用
      </Text>
      <Text className="block text-[58px] font-extrabold leading-[1.38] text-[#08112f]">
        考勤小程序
      </Text>
    </View>
  );
}

export function LoginMethodTabs(props: {
  onChange: (method: LoginMethod) => void;
  value: LoginMethod;
}) {
  return (
    <View className="mb-[38px] box-border flex h-[108px] overflow-hidden rounded-[22px] border border-[#e3e7f3] bg-[#f8faff] p-[4px] shadow-[0_14px_38px_rgba(35,45,84,0.09)]">
      {loginMethodOptions.map((option) => {
        const isActive = props.value === option.value;

        return (
          <View
            key={option.value}
            className={joinClasses(
              'relative flex h-full flex-1 items-center justify-center rounded-[18px]',
              isActive
                ? 'bg-white text-[#4f46f5] shadow-[0_10px_28px_rgba(79,70,229,0.10)]'
                : 'text-[#4f5874]',
            )}
            onTap={() => props.onChange(option.value)}
          >
            <Text className="block text-[29px] font-semibold leading-[100px]">{option.label}</Text>
            <View
              className={joinClasses(
                'absolute bottom-[6px] h-[5px] rounded-full bg-[#5b5cff]',
                option.underlineWidthClass,
                isActive ? 'opacity-100' : 'opacity-0',
              )}
            />
          </View>
        );
      })}
    </View>
  );
}

export function CompanySelector() {
  return (
    <LoginFieldFrame icon={Building2} iconShape="square">
      <Text className="block flex-1 text-[29px] leading-[96px] text-[#9099ad]">
        请选择企业 / 公司
      </Text>
      <ChevronDown color="#8a94ab" size={28} strokeWidth={1.9} />
    </LoginFieldFrame>
  );
}

export function AccountLoginFields(props: {
  form: LoginRequest;
  isVisible: boolean;
  onChange: (form: LoginRequest) => void;
  onTogglePassword: () => void;
  showPassword: boolean;
}) {
  return (
    <View className={props.isVisible ? 'block' : 'hidden'}>
      <LoginFieldFrame icon={UserRound} iconShape="circle">
        <Input
          className="input h-[96px] flex-1 text-[29px] leading-[96px] text-[#111936]"
          placeholder="账号 / 手机号"
          placeholderClass="text-[#9aa3b5]"
          type="text"
          value={props.form.phone}
          onInput={(event) =>
            props.onChange({ ...props.form, phone: String(event.detail.value) })
          }
        />
      </LoginFieldFrame>

      <LoginFieldFrame hasBottomGap={false} icon={Lock} iconShape="square">
        <Input
          className="input h-[96px] flex-1 text-[29px] leading-[96px] text-[#111936]"
          password={!props.showPassword}
          placeholder="请输入密码"
          placeholderClass="text-[#9aa3b5]"
          value={props.form.password}
          onInput={(event) =>
            props.onChange({ ...props.form, password: String(event.detail.value) })
          }
        />
        <View
          className="ml-[16px] flex h-[64px] w-[64px] items-center justify-center"
          onClick={props.onTogglePassword}
        >
          {props.showPassword ? (
            <EyeOff color="#8a94ab" size={26} strokeWidth={1.9} />
          ) : (
            <Eye color="#8a94ab" size={26} strokeWidth={1.9} />
          )}
        </View>
      </LoginFieldFrame>

      <Text className="mt-[14px] block text-right text-[25px] font-medium leading-[1.5] text-[#4f46f5]">
        忘记密码
      </Text>
    </View>
  );
}

export function SmsLoginFields(props: {
  form: SmsLoginForm;
  isVisible: boolean;
  onChange: (form: SmsLoginForm) => void;
}) {
  return (
    <View className={props.isVisible ? 'block' : 'hidden'}>
      <LoginFieldFrame icon={UserRound} iconShape="circle">
        <Input
          className="input h-[96px] flex-1 text-[29px] leading-[96px] text-[#111936]"
          placeholder="手机号"
          placeholderClass="text-[#9aa3b5]"
          type="text"
          value={props.form.phone}
          onInput={(event) =>
            props.onChange({ ...props.form, phone: String(event.detail.value) })
          }
        />
      </LoginFieldFrame>

      <LoginFieldFrame hasBottomGap={false} icon={KeyRound} iconShape="square">
        <Input
          className="input h-[96px] flex-1 text-[29px] leading-[96px] text-[#111936]"
          placeholder="短信验证码"
          placeholderClass="text-[#9aa3b5]"
          type="text"
          value={props.form.code}
          onInput={(event) =>
            props.onChange({ ...props.form, code: String(event.detail.value) })
          }
        />
        <Text className="ml-[16px] block text-[25px] font-semibold leading-[96px] text-[#4f46f5]">
          获取验证码
        </Text>
      </LoginFieldFrame>
    </View>
  );
}

export function LoginSubmitButton(props: {
  children: ReactNode;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      className={`primaryButton mt-[36px] flex h-[104px] items-center justify-center rounded-[18px] border-0 text-[34px] font-semibold leading-[104px] text-white shadow-[0_20px_42px_rgba(79,70,229,0.24)] ${primaryGradientClass} ${props.disabled ? 'opacity-60' : ''}`}
      disabled={props.disabled}
      onClick={props.onClick}
    >
      {props.children}
    </Button>
  );
}

export function LoginDivider() {
  return (
    <View className="my-[34px] flex items-center gap-[28px]">
      <View className="h-px flex-1 bg-[#e6eaf3]" />
      <Text className="block text-[26px] leading-none text-[#8a94ab]">或</Text>
      <View className="h-px flex-1 bg-[#e6eaf3]" />
    </View>
  );
}

export function WechatLoginButton(props: {
  disabled: boolean;
  isSubmitting: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      className={`wechatLoginButton flex h-[92px] items-center justify-center rounded-[18px] border border-[#b8b5ff] bg-white text-[30px] font-semibold leading-[92px] text-[#4f46f5] ${props.disabled ? 'opacity-60' : ''}`}
      disabled={props.disabled}
      onClick={props.onClick}
    >
      <View className="mr-[14px] flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#5b5cff]">
        <MessageCircle color="#ffffff" size={21} strokeWidth={2} />
      </View>
      {props.isSubmitting ? '正在获取微信凭证...' : '微信登录'}
    </Button>
  );
}

export function LoginStatusMessage(props: { status: LoginStatus }) {
  return (
    <View
      className={`mt-[26px] rounded-[18px] border px-[24px] py-[18px] ${statusToneClass[props.status.tone]}`}
    >
      <Text className="block text-[24px] leading-[1.5]">{props.status.message}</Text>
    </View>
  );
}

export function AgreementToggle(props: {
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <View className="mt-[32px] flex items-center justify-center px-[8px]" onClick={props.onToggle}>
      <View
        className={`mr-[16px] flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full border-[3px] ${props.checked ? 'border-[#5b5cff] bg-[#5b5cff]' : 'border-[#98a2b3] bg-white'}`}
      >
        {props.checked ? <Check color="#ffffff" size={18} strokeWidth={2.5} /> : null}
      </View>
      <Text className="text-[23px] leading-[1.6] text-[#7b8498]">
        我已阅读并同意
        <Text className="text-[#4f46f5]">《用户协议》</Text>
        和
        <Text className="text-[#4f46f5]">《隐私政策》</Text>
      </Text>
    </View>
  );
}

export function AccountModeShortcut(props: {
  isVisible: boolean;
  onClick: () => void;
}) {
  return (
    <Text
      className={`mt-[24px] text-center text-[25px] font-medium leading-[1.5] text-[#4f46f5] ${props.isVisible ? 'block' : 'hidden'}`}
      onClick={props.onClick}
    >
      使用账号密码登录
    </Text>
  );
}

function LoginFieldFrame(props: {
  children: ReactNode;
  hasBottomGap?: boolean;
  icon: LoginIconComponent;
  iconShape: 'circle' | 'square';
}) {
  const Icon = props.icon;

  return (
    <View
      className={joinClasses(
        'flex h-[96px] items-center rounded-[18px] border border-[#e1e6f2] bg-white px-[28px] shadow-[0_10px_30px_rgba(30,41,78,0.06)]',
        props.hasBottomGap === false ? undefined : 'mb-[28px]',
      )}
    >
      <View
        className={joinClasses(
          'mr-[24px] flex h-[42px] w-[42px] items-center justify-center border border-[#d8deec]',
          props.iconShape === 'circle' ? 'rounded-full' : 'rounded-[10px]',
        )}
      >
        <Icon color="#9099ad" size={21} strokeWidth={1.9} />
      </View>
      {props.children}
    </View>
  );
}

function joinClasses(...classes: Array<string | undefined>) {
  return classes.filter(Boolean).join(' ');
}
