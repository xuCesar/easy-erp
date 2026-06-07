export function isoDate(value: string): string {
  return value.slice(0, 10);
}

export function formatDateTime(value: string): string {
  return value.replace('T', ' ').slice(0, 16);
}

export function formatClock(value: string | undefined): string {
  if (!value) {
    return '-';
  }

  return value.replace('T', ' ').slice(11, 16);
}

export function formatShortDate(value: string | undefined): string {
  if (!value) {
    return '-';
  }

  const normalized = value.slice(0, 10);
  const [, month, day] = normalized.split('-');
  return `${Number(month)}月${Number(day)}日`;
}

export function formatTime(value: Date): string {
  return value.toLocaleTimeString('zh-CN', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function formatWeekdayDate(value: Date): string {
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  return `${value.getFullYear()}年${value.getMonth() + 1}月${value.getDate()}日 ${weekdays[value.getDay()]}`;
}

export function currentMonthDateRange(now = new Date()): {
  endDate: string;
  startDate: string;
} {
  return {
    startDate: `${now.toISOString().slice(0, 7)}-01`,
    endDate: now.toISOString().slice(0, 10),
  };
}
