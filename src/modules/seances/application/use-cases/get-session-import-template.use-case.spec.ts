import { SESSION_DISCIPLINE_FAMILIES } from '../../../../shared/domain/value-objects/sport-family.vo.js';
import { GetSessionImportTemplateUseCase } from './get-session-import-template.use-case.js';

describe('GetSessionImportTemplateUseCase', () => {
  it('annonce le type et la version du format', async () => {
    const template = await new GetSessionImportTemplateUseCase().execute();

    expect(template.kind).toBe('plan-seances');
    expect(template.schemaVersion).toBe(1);
  });

  it('liste les familles de discipline au champ disciplineTypeKey', async () => {
    const template = await new GetSessionImportTemplateUseCase().execute();

    expect(template.seances[0]?.disciplineTypeKey).toBe(
      SESSION_DISCIPLINE_FAMILIES.join(' | '),
    );
    expect(template.seances[0]?.disciplineTypeKey).toBe(
      'running | cycling | swimming',
    );
  });

  it('liste les cinq types de module au champ type', async () => {
    const template = await new GetSessionImportTemplateUseCase().execute();

    expect(template.seances[0]?.modules[0]?.type).toBe(
      'echauffement | educatifs | series | retour_au_calme | autre',
    );
  });

  it('liste les valeurs de 1 à 10 au champ perceivedEffort', async () => {
    const template = await new GetSessionImportTemplateUseCase().execute();

    expect(template.seances[0]?.modules[0]?.perceivedEffort).toBe(
      '1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10',
    );
  });
});
