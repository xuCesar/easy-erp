import Taro from '@tarojs/taro';
import type { CheckinResult } from '@easy-erp/shared-types';
import {
  Card,
  ItemMeta,
  ItemTitle,
  ListItem,
  PageShell,
  PrimaryButton,
  StatusBadge,
  StatusText,
} from '../../ui';

const lastResultKey = 'easy-erp-miniapp-last-checkin-result';

export default function CheckinResultPage() {
  const result = Taro.getStorageSync<CheckinResult | ''>(lastResultKey);

  return (
    <PageShell title="打卡结果" subtitle="打卡原始记录不可变，异常后续通过补卡或审批链路修正。">
      <Card>
        {result ? (
          <ListItem>
            <ItemTitle>{result.message}</ItemTitle>
            <StatusBadge tone={result.isValid ? 'success' : 'danger'}>
              {result.isValid ? '有效' : '异常'}
            </StatusBadge>
            <ItemMeta>类型：{result.checkinType}</ItemMeta>
            <ItemMeta>时间：{result.checkinAt}</ItemMeta>
            <ItemMeta>原因：{result.invalidReason ?? '-'}</ItemMeta>
          </ListItem>
        ) : (
          <StatusText>暂无最近一次打卡结果。</StatusText>
        )}
        <PrimaryButton onClick={() => Taro.navigateTo({ url: '/pages/checkin/index' })}>返回打卡</PrimaryButton>
      </Card>
    </PageShell>
  );
}
