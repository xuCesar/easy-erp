import type {
  AccountStatus,
  AccountUserListItem,
  ApiClient,
  CreateAccountUserRequest,
  PaginatedData,
  Role,
  UpdateAccountUserRequest,
} from '@easy-erp/shared-types';
import { buildQuery, emptyPage, requestData } from './common';

export function createAccountsPage(client: ApiClient) {
  return {
    emptyData: emptyPage<AccountUserListItem>(),

    list(query: {
      keyword?: string;
      status?: AccountStatus;
      page?: number;
      pageSize?: number;
    } = {}): Promise<PaginatedData<AccountUserListItem>> {
      return requestData(
        client.get<PaginatedData<AccountUserListItem>>(
          `/api/v1/accounts${buildQuery(query)}`,
        ),
      );
    },

    create(input: CreateAccountUserRequest): Promise<AccountUserListItem> {
      return requestData(
        client.post<AccountUserListItem, CreateAccountUserRequest>('/api/v1/accounts', input),
      );
    },

    update(id: string, input: UpdateAccountUserRequest): Promise<AccountUserListItem> {
      return requestData(
        client.patch<AccountUserListItem, UpdateAccountUserRequest>(`/api/v1/accounts/${id}`, input),
      );
    },

    setStatus(id: string, status: AccountStatus): Promise<AccountUserListItem> {
      return this.update(id, { status });
    },

    setRole(id: string, role: Role): Promise<AccountUserListItem> {
      return this.update(id, { roles: [role] });
    },
  };
}
