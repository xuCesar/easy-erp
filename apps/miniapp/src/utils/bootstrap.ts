import { clearSession, isSessionActive, loadSession } from '../api';
import { toastInfo } from '../feedback';

export function bootstrapApp() {
  const session = loadSession();

  if (session && !isSessionActive(session)) {
    clearSession();
    // 当前后端尚未接入小程序静默刷新，启动时仅提示会话已过期，避免误用旧 token。
    toastInfo('登录已过期，请重新登录');
  }
}
