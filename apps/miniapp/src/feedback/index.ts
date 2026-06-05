import Taro from '@tarojs/taro';
import { getErrorMessage } from '../api';

export function toastSuccess(title: string, duration = 1800) {
  return Taro.showToast({
    title,
    icon: 'success',
    duration,
  });
}

export function toastInfo(title: string, duration = 1800) {
  return Taro.showToast({
    title,
    icon: 'none',
    duration,
  });
}

export function toastError(error: unknown, fallback = '操作失败，请稍后重试。', duration = 2200) {
  return Taro.showToast({
    title: getErrorMessage(error, fallback),
    icon: 'none',
    duration,
  });
}
