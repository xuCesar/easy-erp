export interface RuntimeAdapter {
  now(): string;
  idempotencyKey(action: string): string;
  deviceId?: string;
}

export type MiniappRuntime = RuntimeAdapter;
