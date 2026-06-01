import type { ApiClient, LoginRequest, LoginResponse } from '@easy-erp/shared-types';
import { requestData } from '../../shared/api/response';

export function createLoginPage(client: ApiClient) {
  return {
    submit(request: LoginRequest): Promise<LoginResponse> {
      return requestData(client.post<LoginResponse, LoginRequest>('/api/v1/auth/login', request));
    },
  };
}
