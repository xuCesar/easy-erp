import { Button, Input, Text, View } from '@tarojs/components';
import { ChevronLeft, ChevronRight } from 'lucide-react-taro';
import type { IconProps } from 'lucide-react-taro';
import { RouteName } from '../constants/routes';
import { navigateBack, switchTab } from '../router';
import type { PageNoticeTone } from '../shared/types/pageNotice';

export type MiniIconComponent = React.ComponentType<IconProps>;

const iconToneClass: Record<PageNoticeTone, string> = {
  primary: 'bg-[#f0efff]',
  success: 'bg-[#e9f9f0]',
  warning: 'bg-[#fff3e8]',
  danger: 'bg-[#fff0f3]',
  muted: 'bg-[#f4f6fb]',
};

const iconToneColor: Record<PageNoticeTone, string> = {
  primary: '#5b55ff',
  success: '#22c55e',
  warning: '#f97316',
  danger: '#ff4d6d',
  muted: '#667085',
};

export function MiniPage(props: { children: React.ReactNode; compact?: boolean }) {
  return (
    <View
      className={`box-border min-h-screen bg-[#fbfcff] px-[32px] text-[#07112f] ${props.compact ? 'pb-[72px]' : 'pb-[168px]'} pt-[78px]`}
    >
      {props.children}
    </View>
  );
}

export function MiniHeader(props: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  back?: boolean;
}) {
  return (
    <View className="mb-[32px]">
      <View className="flex h-[72px] items-center justify-between">
        <View className="flex min-w-0 flex-1 items-center gap-[18px]">
          {props.back ? (
            <View
              className="flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-full bg-white"
              onClick={goBackSafely}
            >
              <ChevronLeft color="#07112f" size={34} strokeWidth={2.1} />
            </View>
          ) : null}
          <Text className="block text-[42px] font-extrabold leading-[1.15] text-[#07112f]">
            {props.title}
          </Text>
        </View>
        {props.right ? <View className="shrink-0">{props.right}</View> : null}
      </View>
      {props.subtitle ? (
        <Text className="mt-[8px] block text-[27px] leading-[1.5] text-[#667085]">
          {props.subtitle}
        </Text>
      ) : null}
    </View>
  );
}

export function MiniCard(props: { children: React.ReactNode; className?: string }) {
  return (
    <View
      className={`box-border rounded-[28px] border border-[#edf0f7] bg-white p-[28px] shadow-[0_18px_55px_rgba(25,35,76,0.06)] ${props.className ?? ''}`}
    >
      {props.children}
    </View>
  );
}

export function MiniIcon(props: {
  icon: MiniIconComponent;
  tone?: PageNoticeTone;
  size?: 'md' | 'lg';
}) {
  const tone = props.tone ?? 'primary';
  const sizeClass = props.size === 'lg' ? 'h-[72px] w-[72px]' : 'h-[54px] w-[54px]';
  const iconSize = props.size === 'lg' ? 36 : 24;
  const Icon = props.icon;

  return (
    <View
      className={`flex shrink-0 items-center justify-center rounded-[22px] ${sizeClass} ${iconToneClass[tone]}`}
    >
      <Icon color={iconToneColor[tone]} size={iconSize} strokeWidth={1.9} />
    </View>
  );
}

export function MiniSectionTitle(props: { title: string; subtitle?: string }) {
  return (
    <View className="mb-[20px]">
      <Text className="block text-[31px] font-extrabold text-[#07112f]">{props.title}</Text>
      {props.subtitle ? (
        <Text className="mt-[6px] block text-[24px] leading-[1.5] text-[#667085]">
          {props.subtitle}
        </Text>
      ) : null}
    </View>
  );
}

export function MiniButton(props: {
  children: React.ReactNode;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  onClick: () => void;
  className?: string;
}) {
  const variantClass =
    props.variant === 'secondary'
      ? 'border border-[#e4e8f2] bg-white text-[#4f46f5] shadow-[0_12px_34px_rgba(25,35,76,0.06)]'
      : props.variant === 'danger'
        ? 'bg-[#ff4d6d] text-white shadow-[0_18px_42px_rgba(255,77,109,0.22)]'
        : 'bg-[#5b55ff] text-white shadow-[0_20px_48px_rgba(91,85,255,0.28)]';

  return (
    <Button
      className={`miniButton primaryButton flex h-[96px] box-border items-center justify-center rounded-[24px] border-0 px-[28px] text-[30px] font-extrabold leading-[96px] ${variantClass} ${props.disabled ? 'opacity-55' : ''} ${props.className ?? ''}`}
      disabled={props.disabled}
      onClick={props.onClick}
    >
      {props.children}
    </Button>
  );
}

export function MiniField(props: {
  label: string;
  value: string;
  placeholder?: string;
  password?: boolean;
  type?: 'text' | 'number';
  onInput: (value: string) => void;
}) {
  return (
    <View className="mb-[22px] rounded-[24px] border border-[#edf0f7] bg-white px-[26px] py-[18px] shadow-[0_14px_38px_rgba(25,35,76,0.045)]">
      <Text className="mb-[10px] block text-[26px] font-bold text-[#07112f]">{props.label}</Text>
      <Input
        className="input box-border h-[58px] min-w-0 bg-white text-[28px] leading-[58px] text-[#07112f]"
        password={props.password}
        type={props.type ?? 'text'}
        value={props.value}
        placeholder={props.placeholder}
        onInput={(event) => props.onInput(String(event.detail.value))}
      />
    </View>
  );
}

export function MiniStatus(props: { children: React.ReactNode; tone?: PageNoticeTone }) {
  const toneClass: Record<PageNoticeTone, string> = {
    primary: 'bg-[#f0efff] text-[#4f46f5]',
    success: 'bg-[#e9f9f0] text-[#16a34a]',
    warning: 'bg-[#fff3e8] text-[#f97316]',
    danger: 'bg-[#fff0f3] text-[#ff4d6d]',
    muted: 'bg-[#f4f6fb] text-[#667085]',
  };

  return (
    <Text
      className={`inline-block whitespace-nowrap rounded-[14px] px-[16px] py-[8px] text-[23px] font-bold leading-[1.2] ${toneClass[props.tone ?? 'muted']}`}
    >
      {props.children}
    </Text>
  );
}

export function Chevron() {
  return <ChevronRight color="#98a2b3" size={32} strokeWidth={1.9} />;
}

export function MiniEmpty(props: { title: string; description: string }) {
  return (
    <View className="rounded-[24px] border border-dashed border-[#d8deea] bg-[#f8faff] px-[24px] py-[30px]">
      <Text className="block text-[30px] font-extrabold text-[#07112f]">{props.title}</Text>
      <Text className="mt-[8px] block text-[24px] leading-[1.5] text-[#667085]">
        {props.description}
      </Text>
    </View>
  );
}

function goBackSafely() {
  void navigateBack().catch(() => {
    void switchTab(RouteName.HOME);
  });
}
