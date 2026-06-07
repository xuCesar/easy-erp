import type { PropsWithChildren } from 'react';
import { useLaunch } from '@tarojs/taro';
import { bootstrapApp } from './utils/bootstrap';
import './app.css';

export default function App({ children }: PropsWithChildren) {
  useLaunch(() => {
    bootstrapApp();
  });

  return children;
}
