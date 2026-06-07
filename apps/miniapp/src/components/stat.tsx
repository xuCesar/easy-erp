import { Text, View } from '@tarojs/components';

export function MetricStat(props: {
  value: string;
  label: string;
  tone: 'primary' | 'warning' | 'muted';
  valueClassName?: string;
  labelClassName?: string;
}) {
  const colorClass =
    props.tone === 'warning'
      ? 'text-[#f97316]'
      : props.tone === 'primary'
        ? 'text-[#4f46f5]'
        : 'text-[#07112f]';

  return (
    <View className="items-center border-r border-[#edf0f7] last:border-r-0">
      <Text
        className={`block text-center font-extrabold ${colorClass} ${props.valueClassName ?? 'text-[36px]'}`}
      >
        {props.value}
      </Text>
      <Text
        className={`mt-[8px] block text-center text-[#667085] ${props.labelClassName ?? 'text-[23px]'}`}
      >
        {props.label}
      </Text>
    </View>
  );
}
