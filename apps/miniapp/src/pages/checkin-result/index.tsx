import { Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import type { CheckinResult } from '@easy-erp/shared-types';
import { CircleAlert, CircleCheckBig } from 'lucide-react-taro';
import { MiniButton, MiniCard, MiniEmpty, MiniHeader, MiniIcon, MiniPage, MiniStatus } from '../../components';
import { RouteName } from '../../constants/routes';
import { useAuthGuard } from '../../hooks/useAuthGuard';
import { navigateTo } from '../../router';
import { STORAGE_KEYS } from '../../shared/constants/app';
import { formatDateTime } from '../../shared/utils/date';

export default function CheckinResultPage() {
  useAuthGuard();

  const result = Taro.getStorageSync<CheckinResult | ''>(STORAGE_KEYS.lastCheckinResult);

  return (
    <MiniPage compact>
      <MiniHeader title="打卡结果" back />

      <MiniCard>
        {result ? (
          <CheckinResultContent result={result} />
        ) : (
          <MiniEmpty title="暂无结果" description="最近一次打卡结果会显示在这里。" />
        )}
      </MiniCard>

      <View className="mt-[24px] grid gap-[16px]">
        <MiniButton onClick={() => navigateTo(RouteName.CHECKIN)}>返回打卡</MiniButton>
        <MiniButton variant="secondary" onClick={() => navigateTo(RouteName.ATTENDANCE_RECORDS)}>查看记录</MiniButton>
        {result && !result.isValid ? (
          <MiniButton variant="secondary" onClick={() => navigateTo(RouteName.REPAIR_REQUEST)}>发起补卡</MiniButton>
        ) : null}
      </View>
    </MiniPage>
  );
}

function CheckinResultContent(props: { result: CheckinResult }) {
  const StatusIcon = props.result.isValid ? CircleCheckBig : CircleAlert;

  return (
    <View className="items-center">
      <MiniIcon icon={StatusIcon} tone={props.result.isValid ? 'success' : 'danger'} size="lg" />
      <Text className="mt-[24px] block text-center text-[40px] font-extrabold text-[#07112f]">
        {props.result.isValid ? '打卡已记录' : '打卡存在异常'}
      </Text>
      <Text className="mt-[12px] block text-center text-[27px] leading-[1.5] text-[#667085]">{props.result.message}</Text>
      <View className="mt-[28px] w-full rounded-[24px] bg-[#f8faff] px-[24px] py-[22px]">
        <InfoRow label="类型" value={props.result.checkinType === 'CLOCK_OUT' ? '下班打卡' : '上班打卡'} />
        <InfoRow label="时间" value={formatDateTime(props.result.checkinAt)} />
        <InfoRow label="状态" value={props.result.isValid ? '有效' : props.result.invalidReason ?? '异常'} />
      </View>
      {!props.result.isValid ? (
        <View className="mt-[22px]">
          <MiniStatus tone="warning">如影响考勤结论，请发起补卡或联系管理员处理。</MiniStatus>
        </View>
      ) : null}
    </View>
  );
}

function InfoRow(props: { label: string; value: string }) {
  return (
    <View className="flex items-center justify-between border-b border-[#edf0f7] py-[14px] last:border-b-0">
      <Text className="text-[25px] text-[#667085]">{props.label}</Text>
      <Text className="text-[26px] font-bold text-[#07112f]">{props.value}</Text>
    </View>
  );
}
