import { createAppServices } from './app';

export function createRuntimeServices() {
  return createAppServices();
}

export * from './app';
