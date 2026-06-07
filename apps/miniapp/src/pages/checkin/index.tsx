import { useEffect, useState } from 'react';
import Taro from '@tarojs/taro';
import { Text, View } from '@tarojs/components';
import type {
  CheckinContext,
  CheckinType,
  GeoLocationPayload,
  WifiPayload,
} from '@easy-erp/shared-types';
import { createRuntimePages } from '../../services';
import { Card, PageShell, PrimaryButton, StatusText } from '../../ui';

const lastResultKey = 'easy-erp-miniapp-last-checkin-result';

export default function CheckinPage() {
  const [context, setContext] = useState<CheckinContext | null>(null);
  const [status, setStatus] = useState('正在读取打卡上下文...');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    void loadContext();
  }, []);

  async function loadContext() {
    try {
      const nextContext = await createRuntimePages().checkin.loadContext();
      setContext(nextContext);
      setStatus('打卡上下文已加载。');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '无法读取打卡上下文。');
    }
  }

  async function submit(checkinType: CheckinType) {
    if (!context) {
      setStatus('打卡上下文尚未加载。');
      return;
    }

    setIsSubmitting(true);
    setStatus('正在采集打卡凭证...');

    const evidence = await collectEvidence(context);

    if (!context.attendanceGroup.allowOutsideCheckin && evidence.blockingReason) {
      setStatus(evidence.blockingReason);
      setIsSubmitting(false);
      return;
    }

    setStatus(evidence.warning ?? '正在提交打卡...');

    const { result, feedback } = await createRuntimePages().checkin.submitSafely({
      checkinType,
      location: evidence.location,
      wifi: evidence.wifi,
      photoUrl: evidence.photoUrl,
    });

    if (result) {
      Taro.setStorageSync(lastResultKey, result);
      await Taro.navigateTo({ url: '/pages/checkin-result/index' });
    }

    setStatus(evidence.warning ? `${feedback.message}；${evidence.warning}` : feedback.message);
    setIsSubmitting(false);
  }

  const nextAction = context?.status.nextAction === 'NONE' ? null : context?.status.nextAction;

  return (
    <PageShell title="移动打卡" subtitle="Phase 1.5 先完成 API 对接和状态语义，定位、Wi-Fi、拍照可随考勤组规则逐步接入。">
      <Card>
        <View className="listItem">
          <Text className="itemTitle">{context?.attendanceGroup.name ?? '未加载考勤组'}</Text>
          <Text className="itemMeta">班次：{context?.shift.name ?? '-'}</Text>
          <Text className="itemMeta">日期：{context?.date ?? '-'}</Text>
          <Text className="itemMeta">下一动作：{nextAction ?? '今日无需打卡'}</Text>
        </View>
        <PrimaryButton disabled={!nextAction || isSubmitting} onClick={() => submit(nextAction ?? 'CLOCK_IN')}>
          {nextAction === 'CLOCK_OUT' ? '下班打卡' : '上班打卡'}
        </PrimaryButton>
        <PrimaryButton onClick={() => Taro.navigateTo({ url: '/pages/attendance-records/index' })}>查看考勤记录</PrimaryButton>
      </Card>
      <StatusText>{status}</StatusText>
    </PageShell>
  );
}

type CheckinEvidence = {
  location?: GeoLocationPayload;
  wifi?: WifiPayload;
  photoUrl?: string | null;
  warning?: string;
  blockingReason?: string;
};

async function collectEvidence(context: CheckinContext): Promise<CheckinEvidence> {
  const warnings: string[] = [];
  const group = context.attendanceGroup;
  const evidence: CheckinEvidence = {};

  if (group.checkinMethods.includes('GPS')) {
    try {
      const location = await Taro.getLocation({ type: 'gcj02' });
      evidence.location = {
        latitude: location.latitude,
        longitude: location.longitude,
      };
    } catch {
      warnings.push('定位采集失败');
    }
  }

  if (group.checkinMethods.includes('WIFI')) {
    try {
      await Taro.startWifi();
      const wifi = await Taro.getConnectedWifi();
      const wifiInfo = readWifiInfo(wifi);
      evidence.wifi = {
        ssid: wifiInfo.ssid,
        bssid: wifiInfo.bssid,
      };
    } catch {
      warnings.push('Wi-Fi 采集失败');
    }
  }

  if (group.requirePhoto) {
    try {
      const photo = await Taro.chooseImage({ count: 1, sourceType: ['camera'] });
      evidence.photoUrl = photo.tempFilePaths[0] ?? null;
    } catch {
      warnings.push('拍照采集失败');
    }
  }

  evidence.warning = warnings.length > 0 ? warnings.join('，') : undefined;
  evidence.blockingReason = resolveBlockingReason(context, evidence);

  return evidence;
}

function readWifiInfo(value: unknown): { ssid: string; bssid: string } {
  if (!value || typeof value !== 'object' || !('wifi' in value)) {
    throw new Error('Wi-Fi 信息不可用。');
  }

  const wifi = (value as { wifi?: unknown }).wifi;

  if (!wifi || typeof wifi !== 'object') {
    throw new Error('Wi-Fi 信息不可用。');
  }

  const ssid = (wifi as { SSID?: unknown }).SSID;
  const bssid = (wifi as { BSSID?: unknown }).BSSID;

  if (typeof ssid !== 'string' || typeof bssid !== 'string') {
    throw new Error('Wi-Fi 信息不可用。');
  }

  return { ssid, bssid };
}

function resolveBlockingReason(
  context: CheckinContext,
  evidence: CheckinEvidence,
): string | undefined {
  const group = context.attendanceGroup;
  const missing: string[] = [];

  if (group.checkinMethods.includes('GPS') && !evidence.location) {
    missing.push('定位');
  }

  if (group.checkinMethods.includes('WIFI') && !evidence.wifi) {
    missing.push('Wi-Fi');
  }

  if (group.requirePhoto && !evidence.photoUrl) {
    missing.push('拍照');
  }

  return missing.length > 0
    ? `当前考勤组不允许外勤，请先完成${missing.join('、')}采集。`
    : undefined;
}
