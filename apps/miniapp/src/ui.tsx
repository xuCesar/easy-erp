import { Button, Input, Text, View } from '@tarojs/components';
import './ui.css';

export function PageShell(props: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <View className="pageShell">
      <View className="pageHero">
        <Text className="block text-[22px] font-semibold uppercase tracking-[4px] text-cockpit-accent">
          Factory ERP Lite
        </Text>
        <Text className="mt-4 block text-[54px] font-bold leading-tight tracking-[-2px] text-white">
          {props.title}
        </Text>
        <Text className="mt-4 block text-[26px] leading-[1.7] text-white/75">
          {props.subtitle}
        </Text>
      </View>
      <View className="grid gap-[22px]">{props.children}</View>
    </View>
  );
}

export function Card(props: { children: React.ReactNode; tone?: 'default' | 'muted' }) {
  return (
    <View className={`rounded-[32px] border border-cockpit-border p-[26px] shadow-cockpit ${
      props.tone === 'muted' ? 'bg-cockpit-muted/70' : 'bg-white/95'
    }`}>
      {props.children}
    </View>
  );
}

export function Field(props: {
  label: string;
  value: string;
  placeholder?: string;
  password?: boolean;
  onInput: (value: string) => void;
}) {
  return (
    <View className="mb-[22px] grid gap-[10px]">
      <Text className="text-[24px] font-semibold text-cockpit-subtle">{props.label}</Text>
      <Input
        className="input h-[88px] rounded-[24px] border border-cockpit-border bg-white px-[22px] text-[28px] text-cockpit-foreground shadow-sm"
        password={props.password}
        value={props.value}
        placeholder={props.placeholder}
        onInput={(event) => props.onInput(String(event.detail.value))}
      />
    </View>
  );
}

export function PrimaryButton(props: {
  children: React.ReactNode;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  onClick: () => void;
}) {
  const variantClass = props.variant === 'secondary'
    ? 'border border-cockpit-border bg-white text-cockpit-primary'
    : props.variant === 'danger'
      ? 'bg-cockpit-danger text-white'
      : 'bg-cockpit-primary text-white';

  return (
    <Button
      className={`primaryButton mt-[16px] min-h-[88px] rounded-full px-[28px] text-[28px] font-semibold shadow-cockpit ${variantClass}`}
      disabled={props.disabled}
      onClick={props.onClick}
    >
      {props.children}
    </Button>
  );
}

export function StatusText(props: {
  children: React.ReactNode;
  tone?: 'info' | 'success' | 'warning' | 'danger';
}) {
  const toneClass = props.tone === 'success'
    ? 'border-cockpit-success/20 bg-cockpit-success/10 text-cockpit-success'
    : props.tone === 'warning'
      ? 'border-cockpit-warning/20 bg-cockpit-warning/10 text-cockpit-warning'
      : props.tone === 'danger'
        ? 'border-cockpit-danger/20 bg-cockpit-danger/10 text-cockpit-danger'
        : 'border-cockpit-primary/10 bg-white/75 text-cockpit-primary';

  return (
    <Text className={`block rounded-[28px] border px-[24px] py-[18px] text-[26px] leading-[1.55] ${toneClass}`}>
      {props.children}
    </Text>
  );
}

export function ListItem(props: { children: React.ReactNode }) {
  return (
    <View className="border-b border-cockpit-border py-[20px] last:border-b-0">
      {props.children}
    </View>
  );
}

export function ItemTitle(props: { children: React.ReactNode }) {
  return <Text className="mb-[8px] block text-[30px] font-semibold text-cockpit-primary">{props.children}</Text>;
}

export function ItemMeta(props: { children: React.ReactNode }) {
  return <Text className="mt-[6px] block text-[24px] leading-[1.5] text-cockpit-subtle">{props.children}</Text>;
}

export function StatusBadge(props: {
  children: React.ReactNode;
  tone?: 'success' | 'warning' | 'danger' | 'locked';
}) {
  const toneClass = props.tone === 'success'
    ? 'bg-cockpit-success text-white'
    : props.tone === 'danger'
      ? 'bg-cockpit-danger text-white'
      : props.tone === 'locked'
        ? 'bg-cockpit-locked text-white'
        : 'bg-cockpit-warning text-white';

  return (
    <Text className={`inline-block rounded-full px-[18px] py-[6px] text-[22px] font-semibold ${toneClass}`}>
      {props.children}
    </Text>
  );
}
