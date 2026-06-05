import { Text, View } from '@tarojs/components';
import { ChevronLeft, ChevronRight } from 'lucide-react-taro';
import { MetricStat, MiniCard, MiniHeader, MiniPage, MiniSectionTitle } from '../../components';
import { useAuthGuard } from '../../hooks/useAuthGuard';

const days = ['-', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31', '-', '-', '-'];
const bars = [5, 7, 10, 8, 11, 12, 9, 10, 4, 12, 6, 9, 11, 5, 7, 10];

export default function StatisticsPage() {
  useAuthGuard();
  const currentMonthText = `${new Date().getFullYear()}年${new Date().getMonth() + 1}月`;

  return (
    <MiniPage>
      <MiniHeader title="考勤统计" back />

      <View className="mb-[28px] flex items-center justify-center gap-[54px]">
        <ChevronLeft color="#667085" size={32} strokeWidth={1.9} />
        <Text className="text-[34px] font-extrabold text-[#07112f]">{currentMonthText}</Text>
        <ChevronRight color="#667085" size={32} strokeWidth={1.9} />
      </View>

      <View className="mb-[30px]">
        <View className="grid grid-cols-7">
          {['日', '一', '二', '三', '四', '五', '六'].map((day) => (
            <Text key={day} className="block text-center text-[25px] font-semibold text-[#667085]">{day}</Text>
          ))}
        </View>
        <View className="mt-[22px] grid grid-cols-7 gap-y-[22px]">
          {days.map((day, index) => (
            <View key={`${day}-${index}`} className="items-center">
              <View className={`h-[44px] w-[44px] items-center justify-center rounded-full ${day === '20' ? 'bg-[#5b55ff]' : ''}`}>
                <Text className={`block text-center text-[27px] font-semibold leading-[44px] ${day === '20' ? 'text-white' : day === '-' ? 'text-[#c7cfdd]' : 'text-[#07112f]'}`}>
                  {day}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <MiniCard className="mb-[28px]">
        <View className="grid grid-cols-4">
          <MetricStat value="20" label="出勤天数" tone="primary" valueClassName="text-[37px]" labelClassName="mt-[9px] text-[22px]" />
          <MetricStat value="2" label="迟到次数" tone="warning" valueClassName="text-[37px]" labelClassName="mt-[9px] text-[22px]" />
          <MetricStat value="1" label="请假天数" tone="primary" valueClassName="text-[37px]" labelClassName="mt-[9px] text-[22px]" />
          <MetricStat value="160" label="工时(小时)" tone="muted" valueClassName="text-[37px]" labelClassName="mt-[9px] text-[22px]" />
        </View>
      </MiniCard>

      <MiniCard>
        <MiniSectionTitle title="考勤趋势" />
        <View className="mt-[18px] h-[260px] flex-row items-end gap-[16px] border-b border-[#edf0f7] px-[10px]">
          {bars.map((bar, index) => (
            <View key={`${bar}-${index}`} className="flex-1 items-center justify-end">
              <View
                className="w-[12px] rounded-full bg-[#5b55ff] shadow-[0_10px_22px_rgba(91,85,255,0.24)]"
                style={{ height: `${bar * 14}px` }}
              />
            </View>
          ))}
        </View>
        <View className="mt-[18px] flex-row justify-between px-[18px]">
          {['5.1', '5.8', '5.15', '5.22', '5.29'].map((label) => (
            <Text key={label} className="text-[24px] text-[#667085]">{label}</Text>
          ))}
        </View>
      </MiniCard>
    </MiniPage>
  );
}
