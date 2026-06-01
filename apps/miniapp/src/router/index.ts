import Taro from '@tarojs/taro';
import { ROUTES, RouteName, TAB_BAR_ROUTE_NAMES } from '../constants/routes';

export type RouteParams = Record<string, string | number | boolean | null | undefined>;
export type TabBarRouteName = (typeof TAB_BAR_ROUTE_NAMES)[number];

function buildUrl(routeName: RouteName, params?: RouteParams): string {
  const path = ROUTES[routeName];

  if (!params) {
    return path;
  }

  const search = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
    .join('&');

  return search ? `${path}?${search}` : path;
}

export function navigateTo(routeName: RouteName, params?: RouteParams) {
  return Taro.navigateTo({ url: buildUrl(routeName, params) });
}

export function redirectTo(routeName: RouteName, params?: RouteParams) {
  return Taro.redirectTo({ url: buildUrl(routeName, params) });
}

export function reLaunch(routeName: RouteName, params?: RouteParams) {
  return Taro.reLaunch({ url: buildUrl(routeName, params) });
}

export function switchTab(routeName: TabBarRouteName) {
  return Taro.switchTab({ url: ROUTES[routeName] });
}

export function navigateBack(delta = 1) {
  return Taro.navigateBack({ delta });
}

export function isTabBarRoute(routeName: RouteName): routeName is TabBarRouteName {
  return TAB_BAR_ROUTE_NAMES.includes(routeName as TabBarRouteName);
}

export function getRouteNameByPath(path: string): RouteName | undefined {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  return Object.entries(ROUTES).find(
    ([, routePathValue]) => routePathValue === normalizedPath,
  )?.[0] as RouteName | undefined;
}
