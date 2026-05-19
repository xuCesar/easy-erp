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
        <Text className="eyebrow">Factory ERP Lite</Text>
        <Text className="pageTitle">{props.title}</Text>
        <Text className="pageSubtitle">{props.subtitle}</Text>
      </View>
      {props.children}
    </View>
  );
}

export function Card(props: { children: React.ReactNode }) {
  return <View className="card">{props.children}</View>;
}

export function Field(props: {
  label: string;
  value: string;
  placeholder?: string;
  password?: boolean;
  onInput: (value: string) => void;
}) {
  return (
    <View className="field">
      <Text className="fieldLabel">{props.label}</Text>
      <Input
        className="input"
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
  onClick: () => void;
}) {
  return (
    <Button className="primaryButton" disabled={props.disabled} onClick={props.onClick}>
      {props.children}
    </Button>
  );
}

export function StatusText(props: { children: React.ReactNode }) {
  return <Text className="statusText">{props.children}</Text>;
}
