import { useEffect, useMemo, useState } from 'react';
import Taro from '@tarojs/taro';
import { Button, Map, Text, View } from '@tarojs/components';
import type { CheckinContext, CheckinType, GeoLocationPayload } from '@easy-erp/shared-types';
import { Check, MapPin, RefreshCw } from 'lucide-react-taro';
import { createRuntimeServices } from '../../services';
import { MiniCard, MiniHeader, MiniNoticePanel, MiniPage, MiniStatus } from '../../components';
import { cache } from '../../cache';
import { RouteName } from '../../constants/routes';
import { useAuthGuard } from '../../hooks/useAuthGuard';
import { usePageNotice } from '../../hooks/usePageNotice';
import { navigateTo } from '../../router';
import { formatTime, formatWeekdayDate } from '../../shared/utils/date';

type LocationState = {
  location: GeoLocationPayload | null;
  accuracy: number | null;
  error: string;
  isLoading: boolean;
};

const DEFAULT_MAP_CENTER: GeoLocationPayload = {
  latitude: 30.2741,
  longitude: 120.1551,
};

export default function CheckinPage() {
  useAuthGuard();

  const [context, setContext] = useState<CheckinContext | null>(null);
  const [locationState, setLocationState] = useState<LocationState>({
    location: null,
    accuracy: null,
    error: '',
    isLoading: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { notice, clearNotice, showError, showNotice, showWarning } = usePageNotice();
  const nowText = useMemo(() => formatTime(new Date()), []);

  useEffect(() => {
    void loadContext();
    void refreshLocation();
  }, []);

  async function loadContext() {
    setIsLoading(true);
    clearNotice();

    try {
      const nextContext = await createRuntimeServices().checkin.loadContext();
      setContext(nextContext);
    } catch (error) {
      showError(error, '无法读取打卡上下文。', '加载失败');
    } finally {
      setIsLoading(false);
    }
  }

  async function refreshLocation(): Promise<GeoLocationPayload | null> {
    setLocationState((current) => ({ ...current, error: '', isLoading: true }));

    try {
      const result = await Taro.getLocation({
        type: 'gcj02',
        isHighAccuracy: true,
        highAccuracyExpireTime: 4000,
      });
      const location: GeoLocationPayload = {
        latitude: result.latitude,
        longitude: result.longitude,
      };

      setLocationState({
        location,
        accuracy: result.accuracy,
        error: '',
        isLoading: false,
      });

      return location;
    } catch (error) {
      const message = error instanceof Error && error.message.trim()
        ? error.message
        : '定位失败，请确认已授权位置信息并开启定位服务。';

      setLocationState((current) => ({
        ...current,
        error: message,
        isLoading: false,
      }));

      return null;
    }
  }

  async function submit(checkinType: CheckinType) {
    setIsSubmitting(true);
    showWarning('正在提交打卡...');

    const location = locationState.location ?? await refreshLocation();
    const { result, feedback } = await createRuntimeServices().checkin.submitSafely({
      checkinType,
      location: location ?? undefined,
    });

    if (result) {
      cache.set('lastCheckinResult', result);
      await navigateTo(RouteName.CHECKIN_RESULT);
    }

    setIsSubmitting(false);
    showNotice(
      feedback.type === 'success'
        ? 'success'
        : feedback.type === 'network-retry'
          ? 'warning'
          : 'danger',
      feedback.message,
    );
  }

  const nextAction = context?.status.nextAction === 'NONE' ? null : context?.status.nextAction;
  const primaryLabel = isSubmitting
    ? '提交中'
    : nextAction === 'CLOCK_OUT'
      ? '下班打卡'
      : nextAction === 'CLOCK_IN'
        ? '上班打卡'
        : '已完成';
  const isPrimaryDisabled = !nextAction || isSubmitting || isLoading;
  const mapCenter = locationState.location ?? DEFAULT_MAP_CENTER;
  const locationStatusTone = locationState.error ? 'warning' : 'success';
  const locationStatusText = locationState.isLoading
    ? '定位中'
    : locationState.error
      ? '定位异常'
      : '定位正常';

  return (
    <MiniPage compact>
      <MiniHeader
        title="打卡"
        back
        right={<MiniStatus tone={locationStatusTone}>{locationStatusText}</MiniStatus>}
      />

      <View className="mb-[44px] flex items-center justify-between gap-[18px]">
        <View className="flex min-w-0 flex-1 items-center gap-[12px]">
          <MapPin color="#5b55ff" size={30} strokeWidth={2} />
          <Text className="block truncate text-[28px] font-semibold text-[#667085]">
            {locationState.location
              ? context?.attendanceGroup.name
                ? `${context.attendanceGroup.name} · 定位已获取`
                : '定位已获取'
              : locationState.isLoading
                ? '正在获取当前位置...'
                : '当前位置未获取'}
          </Text>
        </View>
        <View
          className="flex h-[58px] w-[58px] shrink-0 items-center justify-center rounded-[18px] bg-[#f0efff]"
          onClick={() => void refreshLocation()}
        >
          <RefreshCw color="#5b55ff" size={28} strokeWidth={2} />
        </View>
      </View>

      <View className="items-center">
        <Text className="block text-center text-[58px] font-extrabold tracking-[1px] text-[#07112f]">
          {context?.status.clockInAt ?? nowText}
        </Text>
        <Text className="mt-[14px] block text-center text-[29px] font-semibold leading-[1.35] text-[#667085]">
          {context?.date ?? formatWeekdayDate(new Date())}
        </Text>
      </View>

      <View className="mt-[58px] items-center">
        <Button
          className={`primaryButton flex h-[250px] w-[250px] box-border items-center justify-center rounded-full border-0 px-[20px] text-center text-[38px] font-extrabold leading-[1.25] text-white shadow-[0_24px_68px_rgba(91,85,255,0.3)] ${
            isPrimaryDisabled ? 'bg-[#a6a1ff] opacity-70' : 'bg-[#5b55ff]'
          }`}
          disabled={isPrimaryDisabled}
          onClick={() => submit(nextAction ?? 'CLOCK_IN')}
        >
          <View>
            <Text className="block text-center text-[38px] font-extrabold text-white">{primaryLabel}</Text>
            <Text className="mt-[14px] block text-center text-[28px] font-semibold text-[#eeedff]">
              {context?.status.clockInAt ?? nowText}
            </Text>
          </View>
        </Button>
      </View>

      <View className="mt-[42px] flex items-center justify-center gap-[12px]">
        <View className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-[#22c55e]">
          <Check color="#ffffff" size={18} strokeWidth={2.6} />
        </View>
        <Text className="text-[28px] font-semibold text-[#667085]">
          {locationState.error
            ? '定位异常，请刷新或检查授权'
            : locationState.accuracy
              ? `已进入考勤范围 · 精度约 ${Math.round(locationState.accuracy)} 米`
              : '等待定位结果'}
        </Text>
      </View>

      <MiniCard className="mt-[36px] h-[270px] overflow-hidden bg-[#f7f8fb] p-0">
        <Map
          className="h-full w-full"
          latitude={mapCenter.latitude}
          longitude={mapCenter.longitude}
          onError={() => {
            setLocationState((current) => current.error
              ? current
              : {
                ...current,
                error: '地图加载失败，请检查微信开发者工具定位与地图能力配置。',
              });
          }}
          scale={17}
          showCompass
          showLocation={Boolean(locationState.location)}
        />
      </MiniCard>

      {locationState.error ? (
        <MiniNoticePanel
          className="mt-[24px]"
          notice={{ tone: 'warning', message: locationState.error }}
        />
      ) : null}

      {notice ? <MiniNoticePanel className="mt-[24px]" notice={notice} /> : null}
    </MiniPage>
  );
}
