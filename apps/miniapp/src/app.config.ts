import { APP_PAGES, RouteName, TAB_BAR_PAGES, routePath } from './constants/routes';

export default defineAppConfig({
  entryPagePath: routePath(RouteName.LOGIN),
  pages: APP_PAGES.map(routePath),
  tabBar: {
    color: '#667085',
    selectedColor: '#4f46f5',
    backgroundColor: '#ffffff',
    borderStyle: 'white',
    list: TAB_BAR_PAGES.map((item) => ({ ...item })),
  },
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#ffffff',
    navigationBarTitleText: 'Factory ERP Lite',
    navigationBarTextStyle: 'black',
  },
});
