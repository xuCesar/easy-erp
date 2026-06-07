import Taro, { useDidShow } from '@tarojs/taro';
import { isSessionActive, loadSession } from '../api';
import { ROUTE_AUTH_CONFIG } from '../constants/routes';
import { getRouteNameByPath } from '../router';
import { redirectToLogin } from '../router/auth';

export function useAuthGuard() {
  useDidShow(() => {
    const pages = Taro.getCurrentPages();
    const currentRoute = pages[pages.length - 1]?.route ?? '';
    const routeName = getRouteNameByPath(currentRoute);
    const requiresAuth = routeName ? ROUTE_AUTH_CONFIG[routeName].required : true;

    if (!requiresAuth || isSessionActive(loadSession())) {
      return;
    }

    void redirectToLogin();
  });
}
