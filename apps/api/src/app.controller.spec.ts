import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';
import { AppController } from './app.controller';

describe('AppController', () => {
  it('returns service health status', async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AppController],
    }).compile();

    const controller = moduleRef.get(AppController);

    expect(controller.getHealth()).toEqual({
      status: 'ok',
      service: 'easy-erp-api',
    });
  });
});
