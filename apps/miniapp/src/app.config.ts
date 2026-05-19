export default defineAppConfig({
  pages: [
    'pages/login/index',
    'pages/checkin/index',
    'pages/checkin-result/index',
    'pages/attendance-records/index',
    'pages/leave-request/index',
    'pages/repair-request/index',
    'pages/profile/index',
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#173f35',
    navigationBarTitleText: 'Factory ERP Lite',
    navigationBarTextStyle: 'white',
  },
});
