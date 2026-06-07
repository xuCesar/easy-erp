import { request, type RequestOptions } from './http';

export interface ApiModuleDefinition<TParams> {
  url: string | ((params: TParams) => string);
  method?: RequestOptions['method'];
  getData?: (params: TParams) => unknown;
  options?: Omit<RequestOptions, 'method' | 'data'>;
}

export function createApiModule<TParams = void, TResult = void>(
  definition: ApiModuleDefinition<TParams>,
) {
  return (params: TParams, overrides?: RequestOptions) => {
    const url = typeof definition.url === 'function' ? definition.url(params) : definition.url;
    const data = definition.getData ? definition.getData(params) : params;

    return request<TResult>(url, {
      method: definition.method ?? 'GET',
      data,
      ...(definition.options ?? {}),
      ...(overrides ?? {}),
    });
  };
}
