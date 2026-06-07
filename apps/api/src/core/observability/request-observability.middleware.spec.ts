import { Logger } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createAccessLogEntry,
  RequestObservabilityMiddleware,
  resolveRequestId,
} from './request-observability.middleware';
import type { AuthPrincipal } from '../auth';

describe('RequestObservabilityMiddleware', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('generates request id when header is missing', () => {
    const requestId = resolveRequestId({});

    expect(requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it('preserves caller-provided request id', () => {
    expect(resolveRequestId({ 'x-request-id': 'pilot-request-1' })).toBe(
      'pilot-request-1',
    );
  });

  it('sets response header and access log without sensitive headers or body', () => {
    const logSpy = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    const finishListeners: Array<() => void> = [];
    const responseHeaders = new Map<string, string>();
    const req = {
      headers: {
        'x-request-id': 'pilot-request-2',
        authorization: 'Bearer secret-token',
      },
      body: {
        password: 'secret-password',
        photoUrl: 'https://example.com/private-photo.jpg',
      },
      method: 'POST',
      originalUrl: '/api/v1/auth/login',
      user: principal(),
    };
    const res = {
      statusCode: 201,
      setHeader: (name: string, value: string) => {
        responseHeaders.set(name, value);
      },
      on: (_event: 'finish', listener: () => void) => {
        finishListeners.push(listener);
      },
    };

    new RequestObservabilityMiddleware().use(req, res, vi.fn());
    finishListeners.forEach((listener) => listener());

    expect(responseHeaders.get('X-Request-Id')).toBe('pilot-request-2');
    expect(logSpy).toHaveBeenCalledTimes(1);

    const logged = String(logSpy.mock.calls[0]?.[0]);
    expect(logged).toContain('"requestId":"pilot-request-2"');
    expect(logged).toContain('"method":"POST"');
    expect(logged).toContain('"path":"/api/v1/auth/login"');
    expect(logged).toContain('"status":201');
    expect(logged).toContain('"tenantId":"tenant-1"');
    expect(logged).toContain('"userId":"user-1"');
    expect(logged).toContain('"employeeId":"employee-1"');
    expect(logged).not.toContain('secret-token');
    expect(logged).not.toContain('secret-password');
    expect(logged).not.toContain('private-photo');
  });
});

describe('createAccessLogEntry', () => {
  it('maps request and principal fields into an access log entry', () => {
    const entry = createAccessLogEntry(
      {
        headers: {},
        method: 'GET',
        originalUrl: '/api/v1/attendance/results?photoUrl=https://example.com/private.jpg',
        user: principal(),
      },
      { statusCode: 200 },
      'request-1',
      process.hrtime.bigint(),
    );

    expect(entry).toMatchObject({
      requestId: 'request-1',
      method: 'GET',
      path: '/api/v1/attendance/results',
      status: 200,
      tenantId: 'tenant-1',
      userId: 'user-1',
      employeeId: 'employee-1',
    });
    expect(entry.durationMs).toBeGreaterThanOrEqual(0);
  });
});

function principal(): AuthPrincipal {
  return {
    id: 'user-1',
    tenantId: 'tenant-1',
    employeeId: 'employee-1',
    roles: ['EMPLOYEE'],
    dataScopes: [{ type: 'EMPLOYEE', employeeId: 'employee-1' }],
  };
}
