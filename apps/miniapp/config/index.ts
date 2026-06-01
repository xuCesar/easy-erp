import { defineConfig } from "@tarojs/cli";
import path from "node:path";
import type { IProjectConfig } from "@tarojs/taro/types/compile";
import { UnifiedWebpackPluginV5 } from "weapp-tailwindcss/webpack";
import devConfig from "./dev";
import prodConfig from "./prod";

type MiniWebpackChain = NonNullable<NonNullable<IProjectConfig<"webpack5">["mini"]>["webpackChain"]>;

const configureMiniWebpack: MiniWebpackChain = (chain) => {
  chain.merge({
    plugin: {
      "weapp-tailwindcss": {
        plugin: UnifiedWebpackPluginV5,
        args: [{
          appType: "taro",
          tailwindcssBasedir: path.resolve(__dirname, ".."),
          tailwindcss: {
            version: 3,
            v4: {
              cssEntries: [path.resolve(__dirname, "../src/app.css")],
            },
          },
        }],
      },
    },
  });
};

const baseConfig: IProjectConfig<"webpack5"> = {
  projectName: "easy-erp-miniapp",
  date: "2026-05-19",
  designWidth: 750,
  deviceRatio: {
    640: 2.34 / 2,
    750: 1,
    828: 1.81 / 2,
  },
  sourceRoot: "src",
  outputRoot: "dist",
  framework: "react",
  compiler: "webpack5",
  plugins: ["@tarojs/plugin-framework-react"],
  mini: {
    webpackChain: configureMiniWebpack,
    postcss: {
      pxtransform: {
        enable: true,
        config: {},
      },
      tailwindcss: {
        enable: true,
        config: {},
      },
      cssModules: {
        enable: false,
      },
    },
  },
};

export default defineConfig((merge, env) => {
  const envConfig = env.mode === "production" ? prodConfig : devConfig;

  return merge(baseConfig, envConfig);
});
