export default {
  defineConstants: {
    TARO_APP_API_BASE_URL: JSON.stringify(
      process.env.TARO_APP_API_BASE_URL ?? "http://192.168.3.236:3000",
    ),
  },
};
