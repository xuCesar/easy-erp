import { RouteName } from '../constants/routes';
import { reLaunch } from './index';

export function redirectToLogin() {
  return reLaunch(RouteName.LOGIN);
}
