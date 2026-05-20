import { defineConfig } from '@tarojs/cli';
import { UnifiedWebpackPluginV5 } from 'weapp-tailwindcss/webpack';

export default defineConfig({
  projectName: 'easy-erp-miniapp',
  date: '2026-05-19',
  designWidth: 750,
  deviceRatio: {
    640: 2.34 / 2,
    750: 1,
    828: 1.81 / 2,
  },
  sourceRoot: 'src',
  outputRoot: 'dist',
  framework: 'react',
  compiler: 'webpack5',
  plugins: ['@tarojs/plugin-framework-react'],
  defineConstants: {
    TARO_APP_API_BASE_URL: JSON.stringify(process.env.TARO_APP_API_BASE_URL ?? ''),
  },
  mini: {
    webpackChain(chain) {
      chain.merge({
        plugin: {
          'weapp-tailwindcss': {
            plugin: UnifiedWebpackPluginV5,
            args: [{ appType: 'taro' }],
          },
        },
      });
    },
    postcss: {
      pxtransform: {
        enable: true,
        config: {},
      },
      cssModules: {
        enable: false,
      },
    },
  },
});
