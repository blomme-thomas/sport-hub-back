import { describe, expect, it, vi } from 'vitest';
import { PauseInvalidError } from '../../domain/errors/pause-invalid.error.js';
import type { IPauseRepository } from '../../domain/ports/outbound/pause.repository.port.js';
import { ListPausesUseCase } from './list-pauses.use-case.js';

function build() {
  const findAll = vi.fn().mockResolvedValue([]);
  const repository = { findAll } as unknown as IPauseRepository;
  return { useCase: new ListPausesUseCase(repository), findAll };
}

describe('ListPausesUseCase', () => {
  it('transmet la période au dépôt', async () => {
    const { useCase, findAll } = build();

    await useCase.execute({ from: '2026-12-01', to: '2026-12-31' });

    expect(findAll).toHaveBeenCalledWith({
      from: '2026-12-01',
      to: '2026-12-31',
    });
  });

  it('refuse une borne qui n’est pas une date calendaire', async () => {
    const { useCase, findAll } = build();

    await expect(
      useCase.execute({ from: '2026-13-01' }),
    ).rejects.toBeInstanceOf(PauseInvalidError);
    expect(findAll).not.toHaveBeenCalled();
  });

  it('refuse une fin antérieure au début', async () => {
    const { useCase } = build();

    await expect(
      useCase.execute({ from: '2026-12-31', to: '2026-12-01' }),
    ).rejects.toBeInstanceOf(PauseInvalidError);
  });
});
