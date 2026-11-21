import { Session } from '../../domain/entities/session.entity.js';
import { SessionImportAlreadyDoneError } from '../../domain/errors/session-import-already-done.error.js';
import { SessionImportInvalidError } from '../../domain/errors/session-import-invalid.error.js';
import type { IDisciplineCatalog } from '../../domain/ports/outbound/discipline-catalog.port.js';
import type {
  ISessionImportRepository,
  SessionImportRecord,
} from '../../domain/ports/outbound/session-import.repository.port.js';
import { ImportSessionsUseCase } from './import-sessions.use-case.js';

const IMPORT_ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
const IMPORTED_AT = new Date('2026-11-25T10:00:00.000Z');

class FakeImportRepository implements ISessionImportRepository {
  readonly imported = new Set<string>();
  saved: { record: SessionImportRecord; sessions: Session[] } | null = null;

  exists(importId: string): Promise<boolean> {
    return Promise.resolve(this.imported.has(importId));
  }

  saveAll(record: SessionImportRecord, sessions: Session[]): Promise<void> {
    this.saved = { record, sessions };
    return Promise.resolve();
  }
}

class FakeDisciplineCatalog implements IDisciplineCatalog {
  constructor(private readonly keys: string[]) {}

  exists(typeKey: string): Promise<boolean> {
    return Promise.resolve(this.keys.includes(typeKey));
  }

  listTypeKeys(): Promise<string[]> {
    return Promise.resolve(this.keys);
  }
}

function seance(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    date: '2026-11-30',
    disciplineTypeKey: 'swimming',
    durationMinutes: 60,
    startTime: '18:00',
    description: 'Séance de fond',
    modules: [
      { type: 'echauffement', durationMinutes: 10, instruction: 'Nage souple' },
      {
        type: 'series',
        durationMinutes: 40,
        instruction: '4 x 100 m',
        targetZones: { pace: { min: 110, max: 120 } },
        perceivedEffort: 7,
      },
    ],
    ...overrides,
  };
}

function plan(seances: unknown[] = [seance()]): Record<string, unknown> {
  return {
    kind: 'plan-seances',
    schemaVersion: 1,
    importId: IMPORT_ID,
    seances,
  };
}

function setup(keys = ['swimming', 'running']) {
  const imports = new FakeImportRepository();
  const useCase = new ImportSessionsUseCase(
    imports,
    new FakeDisciplineCatalog(keys),
    () => IMPORTED_AT,
  );
  return { imports, useCase };
}

async function invalidIssues(
  useCase: ImportSessionsUseCase,
  body: Record<string, unknown>,
): Promise<{ field: string; code: string }[]> {
  try {
    await useCase.execute(body);
  } catch (error) {
    if (error instanceof SessionImportInvalidError) {
      return error.errors.map(({ field, code }) => ({ field, code }));
    }
    throw error;
  }
  throw new Error('import accepté alors qu’il devait être refusé');
}

describe('ImportSessionsUseCase', () => {
  it('ajoute toutes les séances du fichier, planifiées, et enregistre le fichier', async () => {
    const { imports, useCase } = setup();

    const result = await useCase.execute(
      plan([
        seance(),
        seance({ date: '2026-12-01', disciplineTypeKey: 'running' }),
      ]),
    );

    expect(result).toMatchObject({ importId: IMPORT_ID, createdCount: 2 });
    expect(result.sessionIds).toHaveLength(2);
    expect(imports.saved?.record).toEqual({
      importId: IMPORT_ID,
      importedAt: IMPORTED_AT,
      sessionCount: 2,
    });
    expect(imports.saved?.sessions.map((session) => session.status)).toEqual([
      'planifiee',
      'planifiee',
    ]);
  });

  it('refuse tout le fichier quand une seule séance est invalide, sans rien enregistrer', async () => {
    const { imports, useCase } = setup();

    const issues = await invalidIssues(
      useCase,
      plan([seance(), seance({ durationMinutes: 0 })]),
    );

    expect(issues).toEqual([{ field: 'seances[1]', code: 'SESSION_INVALID' }]);
    expect(imports.saved).toBeNull();
  });

  it('signale la discipline absente du référentiel au chemin de la séance', async () => {
    const { useCase } = setup(['swimming']);

    const issues = await invalidIssues(
      useCase,
      plan([seance({ disciplineTypeKey: 'rowing' })]),
    );

    expect(issues).toEqual([
      {
        field: 'seances[0].disciplineTypeKey',
        code: 'SESSION_DISCIPLINE_UNKNOWN',
      },
    ]);
  });

  it('signale le module invalide à son chemin exact', async () => {
    const { useCase } = setup();

    const issues = await invalidIssues(
      useCase,
      plan([
        seance({
          modules: [
            { type: 'echauffement', durationMinutes: 10, instruction: 'Nage' },
            { type: 'inconnu', durationMinutes: 10, instruction: 'Nage' },
          ],
        }),
      ]),
    );

    expect(issues).toEqual([
      { field: 'seances[0].modules[1]', code: 'SESSION_MODULE_INVALID' },
    ]);
  });

  it('refuse une date qui n’existe pas dans le calendrier', async () => {
    const { useCase } = setup();

    const issues = await invalidIssues(
      useCase,
      plan([seance({ date: '2026-02-30' })]),
    );

    expect(issues).toEqual([
      { field: 'seances[0].date', code: 'SESSION_IMPORT_DATE_INVALID' },
    ]);
  });

  it('refuse un champ inconnu, pour détecter les fautes de frappe', async () => {
    const { useCase } = setup();

    const issues = await invalidIssues(useCase, plan([seance({ duree: 60 })]));

    expect(issues).toEqual([
      { field: 'seances[0].duree', code: 'SESSION_IMPORT_UNKNOWN_FIELD' },
    ]);
  });

  it('refuse un champ de mauvais type sans le transmettre au domaine', async () => {
    const { useCase } = setup();

    const issues = await invalidIssues(
      useCase,
      plan([
        seance({
          modules: [{ type: 'series', durationMinutes: 10, instruction: 42 }],
        }),
      ]),
    );

    expect(issues).toEqual([
      {
        field: 'seances[0].modules[0].instruction',
        code: 'SESSION_IMPORT_FIELD_TYPE',
      },
    ]);
  });

  it('refuse un fichier dont le type ou la version ne sont pas ceux du format', async () => {
    const { useCase } = setup();

    const issues = await invalidIssues(useCase, {
      ...plan(),
      kind: 'autre',
      schemaVersion: 2,
    });

    expect(issues).toEqual([
      { field: 'kind', code: 'SESSION_IMPORT_KIND_UNKNOWN' },
      { field: 'schemaVersion', code: 'SESSION_IMPORT_VERSION_UNKNOWN' },
    ]);
  });

  it('refuse un identifiant de fichier qui n’est pas un UUID', async () => {
    const { useCase } = setup();

    const issues = await invalidIssues(useCase, {
      ...plan(),
      importId: 'pas-un-uuid',
    });

    expect(issues).toEqual([
      { field: 'importId', code: 'SESSION_IMPORT_ID_INVALID' },
    ]);
  });

  it('refuse un fichier sans séance', async () => {
    const { useCase } = setup();

    const issues = await invalidIssues(useCase, plan([]));

    expect(issues).toEqual([
      { field: 'seances', code: 'SESSION_IMPORT_EMPTY' },
    ]);
  });

  it('refuse un fichier déjà importé, sans rien ajouter', async () => {
    const { imports, useCase } = setup();
    imports.imported.add(IMPORT_ID);

    await expect(useCase.execute(plan())).rejects.toBeInstanceOf(
      SessionImportAlreadyDoneError,
    );
    expect(imports.saved).toBeNull();
  });
  it('reprend le titre, la distance et la répartition par zone de la séance', async () => {
    const { imports, useCase } = setup();

    await useCase.execute(
      plan([
        seance({
          title: 'Fond en aisance',
          targetDistanceMeters: 10000,
          targetHrZonePercentages: [10, 20, 40, 20, 10],
        }),
      ]),
    );

    expect(imports.saved?.sessions[0]).toMatchObject({
      title: 'Fond en aisance',
      targetDistanceMeters: 10000,
      targetHrZonePercentages: [10, 20, 40, 20, 10],
    });
  });

  it('signale une répartition par zone qui ne totalise pas 100 au chemin de la séance', async () => {
    const { imports, useCase } = setup();

    await expect(
      useCase.execute(
        plan([seance({ targetHrZonePercentages: [10, 20, 40, 20, 20] })]),
      ),
    ).rejects.toBeInstanceOf(SessionImportInvalidError);
    expect(imports.saved).toBeNull();
  });

  it('refuse une répartition par zone qui n’a pas 5 valeurs', async () => {
    const { useCase } = setup();

    const issues = await invalidIssues(
      useCase,
      plan([seance({ targetHrZonePercentages: [50, 50] })]),
    );

    expect(issues).toEqual([
      {
        field: 'seances[0].targetHrZonePercentages',
        code: 'SESSION_IMPORT_FIELD_TYPE',
      },
    ]);
  });
});
