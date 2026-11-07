import type { RecordDisciplineAppearancesUseCase } from '../../../disciplines/application/use-cases/record-discipline-appearances.use-case.js';
import { DisciplinesRegistryAdapter } from './disciplines-registry.adapter.js';

describe('DisciplinesRegistryAdapter', () => {
  let execute: ReturnType<typeof vi.fn>;

  function adapter() {
    const record = { execute } as unknown as RecordDisciplineAppearancesUseCase;
    return new DisciplinesRegistryAdapter(record);
  }

  beforeEach(() => {
    execute = vi.fn().mockResolvedValue(undefined);
  });

  it('transmet les clés de type brutes au use case d’enregistrement', async () => {
    await adapter().recordAppearances(['running', 'cycling']);

    expect(execute).toHaveBeenCalledWith(['running', 'cycling']);
  });

  it('ne transforme pas les clés avant de les transmettre', async () => {
    await adapter().recordAppearances(['  Strength ', '']);

    expect(execute).toHaveBeenCalledWith(['  Strength ', '']);
  });

  it('se termine sans valeur de retour', async () => {
    await expect(adapter().recordAppearances(['running'])).resolves.toBe(
      undefined,
    );
  });

  it('propage une erreur du use case sans la transformer', async () => {
    const failure = new Error('persistance indisponible');
    execute.mockRejectedValue(failure);

    await expect(adapter().recordAppearances(['running'])).rejects.toBe(
      failure,
    );
  });
});
