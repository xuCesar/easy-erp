import { Text, View } from '@tarojs/components';
import { FileUp } from 'lucide-react-taro';
import { Chevron, MiniCard } from './mobile';

export function CardSelectRow(props: {
  label: string;
  value: string;
  onClick: () => void;
}) {
  return (
    <MiniCard className="py-[26px]">
      <View className="flex items-center gap-[18px]" onClick={props.onClick}>
        <Text className="w-[168px] shrink-0 text-[29px] font-bold text-[#07112f]">{props.label}</Text>
        <Text className="min-w-0 flex-1 truncate text-right text-[28px] text-[#98a2b3]">
          {props.value}
        </Text>
        <Chevron />
      </View>
    </MiniCard>
  );
}

export function InlineSelectRow(props: {
  label: string;
  value: string;
  onClick: () => void;
}) {
  return (
    <View
      className="mx-[28px] flex min-h-[98px] items-center gap-[18px] border-b border-[#edf0f7] py-[20px] last:border-b-0"
      onClick={props.onClick}
    >
      <Text className="w-[168px] shrink-0 text-[28px] font-semibold text-[#667085]">{props.label}</Text>
      <Text className="min-w-0 flex-1 truncate text-right text-[28px] text-[#98a2b3]">
        {props.value}
      </Text>
      <Chevron />
    </View>
  );
}

export function AttachmentUploadPlaceholder() {
  return (
    <MiniCard className="min-h-[250px]">
      <Text className="block text-[29px] font-bold text-[#07112f]">附件上传</Text>
      <View className="mt-[26px] h-[142px] w-[142px] items-center justify-center rounded-[18px] border border-dashed border-[#b8c0d4] bg-[#fbfcff]">
        <FileUp color="#98a2b3" size={46} strokeWidth={1.7} />
      </View>
      <Text className="mt-[14px] block text-[25px] text-[#667085]">上传附件</Text>
    </MiniCard>
  );
}
