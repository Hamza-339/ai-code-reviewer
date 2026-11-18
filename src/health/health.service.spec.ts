import { HealthService } from './health.service';

describe('HealthService', () => {
  it('reports ok status', () => {
    const service = new HealthService();

    expect(service.check()).toEqual({ status: 'ok' });
  });
});
