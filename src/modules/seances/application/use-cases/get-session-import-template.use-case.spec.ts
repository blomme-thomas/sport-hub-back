import { GetSessionImportTemplateUseCase } from './get-session-import-template.use-case.js';
import type { IDisciplineCatalog } from '../../domain/ports/outbound/discipline-catalog.port.js';

class FakeDisciplineCatalog implements IDisciplineCatalog {
  constructor(private readonly keys: string[]) {}

  exists(typeKey: string): Promise<boolean> {
    return Promise.resolve(this.keys.includes(typeKey));
  }

  listTypeKeys(): Promise<string[]> {
    return Promise.resolve(this.keys);
  }
}

describe('GetSessionImportTemplateUseCase', () => {
  it('annonce le type et la version du format', async () => {
    const useCase = new GetSessionImportTemplateUseCase(
      new FakeDisciplineCatalog(['swimming']),
    );

    const template = await useCase.execute();

    expect(template.kind).toBe('plan-seances');
    expect(template.schemaVersion).toBe(1);
  });

  it('liste les clés de discipline du référentiel au champ disciplineTypeKey', async () => {
    const useCase = new GetSessionImportTemplateUseCase(
      new FakeDisciplineCatalog(['swimming', 'running']),
    );

    const template = await useCase.execute();

    expect(template.seances[0]?.disciplineTypeKey).toBe('swimming | running');
  });

  it('indique un emplacement quand le référentiel est vide', async () => {
    const useCase = new GetSessionImportTemplateUseCase(
      new FakeDisciplineCatalog([]),
    );

    const template = await useCase.execute();

    expect(template.seances[0]?.disciplineTypeKey).toBe('<clé du référentiel>');
  });

  it('liste les cinq types de module au champ type', async () => {
    const useCase = new GetSessionImportTemplateUseCase(
      new FakeDisciplineCatalog([]),
    );

    const template = await useCase.execute();

    expect(template.seances[0]?.modules[0]?.type).toBe(
      'echauffement | educatifs | series | retour_au_calme | autre',
    );
  });

  it('liste les valeurs de 1 à 10 au champ perceivedEffort', async () => {
    const useCase = new GetSessionImportTemplateUseCase(
      new FakeDisciplineCatalog([]),
    );

    const template = await useCase.execute();

    expect(template.seances[0]?.modules[0]?.perceivedEffort).toBe(
      '1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10',
    );
  });
});
