import Taro from '@tarojs/taro';
import { Text, View } from '@tarojs/components';
import type { CheckinResult } from '@easy-erp/shared-types';
import { Card, PageShell, PrimaryButton, StatusText } from '../../ui';

const lastResultKey = 'easy-erp-miniapp-last-checkin-result';

export default function CheckinResultPage() {
  const result = Taro.getStorageSync<CheckinResult | ''>(lastResultKey);

  return (
    <PageShell title="打卡结果" subtitle="打卡原始记录不可变，异常后续通过补卡或审批链路修正。">
      <Card>
        {result ? (
          <View className="listItem">
            <Text className="itemTitle">{result.message}</Text>
            <Text className="itemMeta">类型：{result.checkinType}</Text>
            <Text className="itemMeta">时间：{result.checkinAt}</Text>
            <Text className="itemMeta">有效：{result.isValid ? '是' : '否'}</Text>
            <Text className="itemMeta">原因：{result.invalidReason ?? '-'}</Text>
          </View>
        ) : (
          <StatusText>暂无最近一次打卡结果。</StatusText>
        )}
        <PrimaryButton onClick={() => Taro.navigateTo({ url: '/pages/checkin/index' })}>返回打卡</PrimaryButton>
      </Card>
    </PageShell>
  );
}
