import { Test } from '@nestjs/testing';
import { Session } from '../../domain/entities/session.entity.js';
import { InvalidSessionError } from '../../domain/errors/invalid-session.error.js';
import { SessionAlreadyCompletedError } from '../../domain/errors/session-already-completed.error.js';
import { SessionNotFoundError } from '../../domain/errors/session-not-found.error.js';
import { UnknownSessionDisciplineError } from '../../domain/errors/unknown-session-discipline.error.js';
import {
  DISCIPLINE_CATALOG,
  type IDisciplineCatalog,
} from '../../domain/ports/outbound/discipline-catalog.port.js';
import { SEANCES_CLOCK } from '../../domain/ports/outbound/seances-clock.port.js';
import {
  SESSION_REPOSITORY,
  type ISessionRepository,
} from '../../domain/ports/outbound/session.repository.port.js';
import type { SessionId } from '../../domain/value-objects/session-id.vo.js';
import { UpdateSessionUseCase } from './update-session.use-case.js';

const NOW = new Date('2026-11-08T10:00:00.000Z');
const UNKNOWN_ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

class FakeSessionRepository implements ISessionRepository {
  readonly sessions = new Map<string, Session>();
  saves = 0;

  findById(id: SessionId): Promise<Session | null> {
    return Promise.resolve(this.sessions.get(id.toString()) ?? null);
  }

  findByPeriod(): Promise<Session[]> {
    return Promise.resolve([...this.sessions.values()]);
  }

  findByActivityIds(activityIds: string[]): Promise<Session[]> {
    return Promise.resolve(
      [...this.sessions.values()].filter((session) =>
        activityIds.includes(session.activityLink?.activityId ?? ''),
      ),
    );
  }

  save(session: Session): Promise<void> {
    this.saves += 1;
    this.sessions.set(session.id.toString(), session);
    return Promise.resolve();
  }

  delete(id: SessionId): Promise<void> {
    this.sessions.delete(id.toString());
    return Promise.resolve();
  }
}

class FakeDisciplineCatalog implements IDisciplineCatalog {
  known: string[];

  constructor(known: string[]) {
    this.known = known;
  }

  exists(typeKey: string): Promise<boolean> {
    return Promise.resolve(this.known.includes(typeKey));
  }
}

function captureError(action: () => Promise<unknown>): Promise<unknown> {
  return action().then(
    () => {
      throw new Error('aucune erreur levée');
    },
    (error: unknown) => error,
  );
}

describe('UpdateSessionUseCase', () => {
  let useCase: UpdateSessionUseCase;
  let repository: FakeSessionRepository;
  let catalog: FakeDisciplineCatalog;
  let session: Session;
  let id: string;

  function seed(overrides: { status?: string; description?: string } = {}) {
    const base = Session.create({
      date: new Date('2026-05-04T00:00:00.000Z'),
      disciplineTypeKey: 'swimming',
      durationMinutes: 60,
      description: overrides.description ?? 'Endurance',
    });
    session = overrides.status
      ? Session.reconstitute({
          id: base.id,
          date: base.date,
          disciplineTypeKey: base.disciplineTypeKey,
          durationMinutes: base.durationMinutes,
          status: overrides.status,
          modifiedManually: false,
          description: base.description,
          equipment: null,
          attentionPoints: null,
          modules: [],
          changeLog: [],
        })
      : base;
    id = session.id.toString();
    return repository.save(session);
  }

  beforeEach(async () => {
    repository = new FakeSessionRepository();
    catalog = new FakeDisciplineCatalog(['swimming', 'running']);
    const moduleRef = await Test.createTestingModule({
      providers: [
        UpdateSessionUseCase,
        { provide: SESSION_REPOSITORY, useValue: repository },
        { provide: DISCIPLINE_CATALOG, useValue: catalog },
        { provide: SEANCES_CLOCK, useValue: () => NOW },
      ],
    }).compile();
    useCase = moduleRef.get(UpdateSessionUseCase);
    await seed();
  });

  describe('modification réussie', () => {
    it('modifie la date, la durée et la description, puis renvoie la séance modifiée', async () => {
      const result = await useCase.execute({
        id,
        date: '2026-05-05',
        durationMinutes: 45,
        description: 'Seuil',
      });

      expect(result).toMatchObject({
        id,
        date: '2026-05-05',
        durationMinutes: 45,
        description: 'Seuil',
        modifiedManually: true,
      });
    });

    it('journalise chaque champ modifié avec sa valeur précédente et la date de la modification', async () => {
      const result = await useCase.execute({
        id,
        date: '2026-05-05',
        durationMinutes: 45,
        description: 'Seuil',
      });

      expect(result.changeLog).toEqual([
        { changedAt: NOW, field: 'date', previousValue: '2026-05-04' },
        { changedAt: NOW, field: 'durationMinutes', previousValue: '60' },
        { changedAt: NOW, field: 'description', previousValue: 'Endurance' },
      ]);
    });

    it('persiste la modification sous le même identifiant', async () => {
      await useCase.execute({ id, durationMinutes: 45 });

      expect(repository.sessions.size).toBe(1);
      expect(repository.sessions.get(id)?.durationMinutes).toBe(45);
      expect(repository.sessions.get(id)?.modifiedManually).toBe(true);
    });

    it('conserve les champs absents de la modification', async () => {
      const result = await useCase.execute({ id, durationMinutes: 45 });

      expect(result).toMatchObject({
        date: '2026-05-04',
        disciplineTypeKey: 'swimming',
        status: 'planifiee',
        description: 'Endurance',
      });
    });

    it('efface la description quand elle vaut null et journalise l’ancienne valeur', async () => {
      const result = await useCase.execute({ id, description: null });

      expect(result.description).toBeNull();
      expect(result.changeLog).toEqual([
        { changedAt: NOW, field: 'description', previousValue: 'Endurance' },
      ]);
    });

    it('passe la séance au statut manquee et le journalise', async () => {
      const result = await useCase.execute({ id, status: 'manquee' });

      expect(result.status).toBe('manquee');
      expect(result.changeLog).toEqual([
        { changedAt: NOW, field: 'status', previousValue: 'planifiee' },
      ]);
    });

    it('ne vérifie pas la discipline quand elle n’est pas fournie, même si le référentiel ne la connaît plus', async () => {
      catalog.known = [];

      const result = await useCase.execute({ id, durationMinutes: 50 });

      expect(result).toMatchObject({
        disciplineTypeKey: 'swimming',
        durationMinutes: 50,
      });
    });

    it('accepte une discipline du référentiel', async () => {
      const result = await useCase.execute({
        id,
        disciplineTypeKey: 'running',
      });

      expect(result.disciplineTypeKey).toBe('running');
    });
  });

  describe('refus sans modification', () => {
    it('ne journalise rien et ne positionne pas modifiedManually quand les valeurs sont identiques', async () => {
      const result = await useCase.execute({
        id,
        date: '2026-05-04',
        durationMinutes: 60,
        description: 'Endurance',
      });

      expect(result).toMatchObject({ modifiedManually: false, changeLog: [] });
    });

    it('refuse une discipline absente du référentiel avec SESSION_DISCIPLINE_UNKNOWN et ne persiste rien', async () => {
      const error = await captureError(() =>
        useCase.execute({ id, disciplineTypeKey: 'curling' }),
      );

      expect(error).toBeInstanceOf(UnknownSessionDisciplineError);
      expect(error).toMatchObject({ code: 'SESSION_DISCIPLINE_UNKNOWN' });
      expect(repository.sessions.get(id)?.disciplineTypeKey).toBe('swimming');
    });

    it('refuse une durée invalide avec SESSION_INVALID et ne persiste rien', async () => {
      const saves = repository.saves;

      await expect(
        useCase.execute({ id, durationMinutes: 0 }),
      ).rejects.toBeInstanceOf(InvalidSessionError);

      expect(repository.saves).toBe(saves);
      expect(repository.sessions.get(id)?.durationMinutes).toBe(60);
    });

    it('refuse un statut hors valeurs avec SESSION_INVALID', async () => {
      await expect(
        useCase.execute({ id, status: 'annulee' }),
      ).rejects.toMatchObject({ code: 'SESSION_INVALID' });

      expect(repository.sessions.get(id)?.status).toBe('planifiee');
    });

    it('refuse un identifiant inconnu avec SESSION_NOT_FOUND sans rien créer', async () => {
      const error = await captureError(() =>
        useCase.execute({ id: UNKNOWN_ID, durationMinutes: 45 }),
      );

      expect(error).toBeInstanceOf(SessionNotFoundError);
      expect(error).toMatchObject({ code: 'SESSION_NOT_FOUND' });
      expect(repository.sessions.has(UNKNOWN_ID)).toBe(false);
      expect(repository.sessions.size).toBe(1);
    });

    it('refuse la modification d’une séance réalisée avec SESSION_ALREADY_COMPLETED et ne persiste rien', async () => {
      await seed({ status: 'realisee' });

      const error = await captureError(() =>
        useCase.execute({ id, durationMinutes: 45 }),
      );

      expect(error).toBeInstanceOf(SessionAlreadyCompletedError);
      expect(error).toMatchObject({ code: 'SESSION_ALREADY_COMPLETED' });
      expect(repository.sessions.get(id)?.durationMinutes).toBe(60);
      expect(repository.sessions.get(id)?.modifiedManually).toBe(false);
    });
  });
});
