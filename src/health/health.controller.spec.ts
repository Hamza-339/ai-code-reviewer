import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController', () => {
  it('reports ok status from the HealthService', () => {
    const controller = new HealthController(new HealthService());

    expect(controller.check()).toEqual({ status: 'ok' });
  });
});
