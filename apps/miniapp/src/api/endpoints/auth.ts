import type { LoginRequest, LoginResponse } from '@easy-erp/shared-types';
import { createApiModule } from '../core/createModule';

const submitLogin = createApiModule<LoginRequest, LoginResponse>({
  url: '/api/v1/auth/login',
  method: 'POST',
  options: {
    skipAuth: true,
  },
});

export const authApi = {
  submit(request: LoginRequest): Promise<LoginResponse> {
    return submitLogin(request);
  },
};

export function createAuthEndpoint() {
  return authApi;
}
