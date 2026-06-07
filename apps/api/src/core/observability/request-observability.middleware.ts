import { Injectable, Logger, type NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { AuthPrincipal } from '../auth';

const REQUEST_ID_HEADER = 'X-Request-Id';
const REQUEST_ID_HEADER_LOWER = REQUEST_ID_HEADER.toLowerCase();

type HeaderValue = string | string[] | undefined;

type ObservableRequest = {
  headers: Record<string, HeaderValue>;
  method?: string;
  originalUrl?: string;
  url?: string;
  path?: string;
  requestId?: string;
  user?: AuthPrincipal;
};

type ObservableResponse = {
  statusCode?: number;
  setHeader(name: string, value: string): void;
  on(event: 'finish', listener: () => void): void;
};

type NextFunction = () => void;

export type AccessLogEntry = {
  requestId: string;
  method: string;
  path: string;
  status: number;
  durationMs: number;
  tenantId?: string;
  userId?: string;
  employeeId?: string;
};

@Injectable()
export class RequestObservabilityMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RequestObservabilityMiddleware.name);

  use(req: ObservableRequest, res: ObservableResponse, next: NextFunction): void {
    const requestId = resolveRequestId(req.headers);
    const startedAt = process.hrtime.bigint();

    req.requestId = requestId;
    res.setHeader(REQUEST_ID_HEADER, requestId);

    res.on('finish', () => {
      const entry = createAccessLogEntry(req, res, requestId, startedAt);
      this.logger.log(JSON.stringify(entry));
    });

    next();
  }
}

export function resolveRequestId(headers: Record<string, HeaderValue>): string {
  const existing = getHeaderValue(headers, REQUEST_ID_HEADER_LOWER);

  return existing.trim() || randomUUID();
}

export function createAccessLogEntry(
  req: ObservableRequest,
  res: Pick<ObservableResponse, 'statusCode'>,
  requestId: string,
  startedAt: bigint,
): AccessLogEntry {
  const durationMs = Number((process.hrtime.bigint() - startedAt) / 1_000_000n);

  return {
    requestId,
    method: req.method ?? 'UNKNOWN',
    path: sanitizePath(req.originalUrl ?? req.url ?? req.path),
    status: res.statusCode ?? 0,
    durationMs,
    tenantId: req.user?.tenantId,
    userId: req.user?.id,
    employeeId: req.user?.employeeId ?? undefined,
  };
}

function getHeaderValue(headers: Record<string, HeaderValue>, name: string): string {
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() !== name) {
      continue;
    }

    const header = Array.isArray(value) ? value[0] : value;
    return header ?? '';
  }

  return '';
}

function sanitizePath(path: string | undefined): string {
  if (!path) {
    return 'UNKNOWN';
  }

  return path.split('?')[0] || '/';
}
