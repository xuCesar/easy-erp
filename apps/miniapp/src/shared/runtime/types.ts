export interface MiniappRuntime {
  now(): string;
  idempotencyKey(action: string): string;
  deviceId?: string;
}
