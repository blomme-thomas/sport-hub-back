import { DependencyUnavailableException } from '../filters/dependency-unavailable.exception.js';
import type { DatabaseHealthIndicator } from './database.health-indicator.js';
import { HealthController } from './health.controller.js';

function controllerWith(status: 'up' | 'down') {
  const indicator = { check: vi.fn(() => Promise.resolve(status)) };
  return {
    controller: new HealthController(
      indicator as unknown as DatabaseHealthIndicator,
    ),
    indicator,
  };
}

describe('HealthController', () => {
  it('répond status ok avec checks.database up quand la base répond', async () => {
    const { controller, indicator } = controllerWith('up');

    await expect(controller.check()).resolves.toEqual({
      status: 'ok',
      checks: { database: 'up' },
    });
    expect(indicator.check).toHaveBeenCalledTimes(1);
  });

  it('lève DependencyUnavailableException avec database down quand la base ne répond pas', async () => {
    const { controller } = controllerWith('down');

    const error = await controller.check().catch((e: unknown) => e);

    expect(error).toBeInstanceOf(DependencyUnavailableException);
    expect((error as DependencyUnavailableException).checks).toEqual({
      database: 'down',
    });
    expect((error as DependencyUnavailableException).getStatus()).toBe(503);
  });
});
