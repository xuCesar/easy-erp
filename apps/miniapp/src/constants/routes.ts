export enum RouteName {
  LOGIN = 'LOGIN',
  HOME = 'HOME',
  CHECKIN = 'CHECKIN',
  REQUESTS = 'REQUESTS',
  STATISTICS = 'STATISTICS',
  PROFILE = 'PROFILE',
  CHECKIN_RESULT = 'CHECKIN_RESULT',
  ATTENDANCE_RECORDS = 'ATTENDANCE_RECORDS',
  LEAVE_REQUEST = 'LEAVE_REQUEST',
  REPAIR_REQUEST = 'REPAIR_REQUEST',
}

export const ROUTES = {
  [RouteName.LOGIN]: '/pages/login/index',
  [RouteName.HOME]: '/pages/home/index',
  [RouteName.CHECKIN]: '/pages/checkin/index',
  [RouteName.REQUESTS]: '/pages/requests/index',
  [RouteName.STATISTICS]: '/pages/statistics/index',
  [RouteName.PROFILE]: '/pages/profile/index',
  [RouteName.CHECKIN_RESULT]: '/pages/checkin-result/index',
  [RouteName.ATTENDANCE_RECORDS]: '/pages/attendance-records/index',
  [RouteName.LEAVE_REQUEST]: '/pages/leave-request/index',
  [RouteName.REPAIR_REQUEST]: '/pages/repair-request/index',
} as const;

export const APP_PAGES = [
  RouteName.LOGIN,
  RouteName.HOME,
  RouteName.CHECKIN,
  RouteName.REQUESTS,
  RouteName.STATISTICS,
  RouteName.PROFILE,
  RouteName.CHECKIN_RESULT,
  RouteName.ATTENDANCE_RECORDS,
  RouteName.LEAVE_REQUEST,
  RouteName.REPAIR_REQUEST,
] as const;

export const TAB_BAR_ROUTE_NAMES = [
  RouteName.HOME,
  RouteName.REQUESTS,
  RouteName.STATISTICS,
  RouteName.PROFILE,
] as const;

export const TAB_BAR_PAGES = [
  {
    pagePath: routePath(RouteName.HOME),
    text: '工作台',
  },
  {
    pagePath: routePath(RouteName.REQUESTS),
    text: '审批',
  },
  {
    pagePath: routePath(RouteName.STATISTICS),
    text: '统计',
  },
  {
    pagePath: routePath(RouteName.PROFILE),
    text: '我的',
  },
] as const;

export const ROUTE_AUTH_CONFIG: Record<RouteName, { required: boolean }> = {
  [RouteName.LOGIN]: { required: false },
  [RouteName.HOME]: { required: true },
  [RouteName.CHECKIN]: { required: true },
  [RouteName.REQUESTS]: { required: true },
  [RouteName.STATISTICS]: { required: true },
  [RouteName.PROFILE]: { required: true },
  [RouteName.CHECKIN_RESULT]: { required: true },
  [RouteName.ATTENDANCE_RECORDS]: { required: true },
  [RouteName.LEAVE_REQUEST]: { required: true },
  [RouteName.REPAIR_REQUEST]: { required: true },
};

export function routePath(routeName: RouteName): string {
  return ROUTES[routeName].replace(/^\//, '');
}
