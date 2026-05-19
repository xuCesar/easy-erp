import { Controller, Get } from '@nestjs/common';

type HealthResponse = {
  status: 'ok';
  service: 'easy-erp-api';
};

@Controller()
export class AppController {
  @Get('health')
  getHealth(): HealthResponse {
    return {
      status: 'ok',
      service: 'easy-erp-api',
    };
  }
}
