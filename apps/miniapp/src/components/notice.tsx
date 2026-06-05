import { Text, View } from '@tarojs/components';
import type { PageNotice, PageNoticeTone } from '../shared/types/pageNotice';
import { MiniEmpty } from './mobile';

const panelToneClass: Record<PageNoticeTone, string> = {
  primary: 'border-[#dbe1ff] bg-[#f7f8ff] text-[#4f46e5]',
  success: 'border-[#c9f0df] bg-[#effcf7] text-[#0f8c6e]',
  warning: 'border-[#ffe2bf] bg-[#fff8ef] text-[#d97706]',
  danger: 'border-[#ffd7d2] bg-[#fff4f2] text-[#b42318]',
  muted: 'border-[#e5e7eb] bg-[#f8fafc] text-[#667085]',
};

const emptyTitleMap: Record<PageNoticeTone, string> = {
  primary: '状态提示',
  success: '处理完成',
  warning: '请稍候',
  danger: '处理失败',
  muted: '暂无数据',
};

export function MiniNoticePanel(props: { notice: PageNotice; className?: string }) {
  return (
    <View
      className={`rounded-[18px] border px-[24px] py-[18px] ${panelToneClass[props.notice.tone]} ${props.className ?? ''}`}
    >
      <Text className="block text-[24px] leading-[1.5]">{props.notice.message}</Text>
    </View>
  );
}

export function MiniEmptyNotice(props: { notice: PageNotice }) {
  return (
    <MiniEmpty
      title={props.notice.title ?? emptyTitleMap[props.notice.tone]}
      description={props.notice.message}
    />
  );
}
