import { InvalidSessionError } from '../errors/invalid-session.error.js';
import { SessionAlreadyCompletedError } from '../errors/session-already-completed.error.js';
import { SessionId } from '../value-objects/session-id.vo.js';
import { SessionModule } from '../value-objects/session-module.vo.js';
import { Session } from './session.entity.js';

const SESSION_ID = '0f8fad5b-d9cb-469f-a165-70867728950e';
const NOW = new Date('2026-11-08T10:00:00.000Z');
const LATER = new Date('2026-11-09T10:00:00.000Z');
const DISCIPLINE_MAX_LENGTH = 100;
const DESCRIPTION_MAX_LENGTH = 2000;
const EQUIPMENT_MAX_LENGTH = 1000;
const ATTENTION_POINTS_MAX_LENGTH = 1000;
const DURATION_MAX = 1440;
const MODULES_MAX = 30;

function day(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

function captureError(action: () => unknown): unknown {
  try {
    action();
  } catch (error) {
    return error;
  }
  throw new Error('aucune erreur levée');
}

function moduleAt(position: number, type = 'educatifs'): SessionModule {
  return SessionModule.create({
    position,
    type,
    durationMinutes: 10,
    instruction: `Consigne ${position}`,
    targetZones: null,
    perceivedEffort: null,
  });
}

function createProps(overrides: Record<string, unknown> = {}) {
  return {
    date: day('2026-05-04'),
    disciplineTypeKey: 'swimming',
    durationMinutes: 60,
    ...overrides,
  };
}

type ReconstituteProps = Parameters<typeof Session.reconstitute>[0];

function reconstituted(overrides: Partial<ReconstituteProps> = {}): Session {
  return Session.reconstitute({
    id: SessionId.create(SESSION_ID),
    date: day('2026-05-04'),
    disciplineTypeKey: 'swimming',
    durationMinutes: 60,
    status: 'planifiee',
    modifiedManually: false,
    description: null,
    equipment: null,
    attentionPoints: null,
    modules: [],
    changeLog: [],
    ...overrides,
  });
}

describe('Session', () => {
  describe('création', () => {
    it('expose les valeurs fournies', () => {
      const session = Session.create(
        createProps({
          description: 'Séance de fond',
          equipment: 'Palmes',
          attentionPoints: 'Épaule droite',
        }),
      );

      expect(session.date.toISOString()).toBe('2026-05-04T00:00:00.000Z');
      expect(session.disciplineTypeKey).toBe('swimming');
      expect(session.durationMinutes).toBe(60);
      expect(session.description).toBe('Séance de fond');
      expect(session.equipment).toBe('Palmes');
      expect(session.attentionPoints).toBe('Épaule droite');
    });

    it('démarre au statut planifiee et non modifiée manuellement', () => {
      const session = Session.create(createProps());

      expect(session.status).toBe('planifiee');
      expect(session.modifiedManually).toBe(false);
    });

    it('démarre sans journal ni journal en attente', () => {
      const session = Session.create(createProps());

      expect(session.changeLog).toEqual([]);
      expect(session.pendingLogEntries).toEqual([]);
    });

    it('démarre sans module quand aucun n’est fourni', () => {
      expect(Session.create(createProps()).modules).toEqual([]);
    });

    it('attribue un identifiant distinct à chaque création', () => {
      const first = Session.create(createProps());
      const second = Session.create(createProps());

      expect(first.id.toString()).not.toBe(second.id.toString());
    });

    it('retire les espaces en bordure de la clé de discipline', () => {
      expect(
        Session.create(createProps({ disciplineTypeKey: '  swimming  ' }))
          .disciplineTypeKey,
      ).toBe('swimming');
    });

    it(`accepte une clé de discipline de ${DISCIPLINE_MAX_LENGTH} caractères`, () => {
      const key = 'a'.repeat(DISCIPLINE_MAX_LENGTH);

      expect(
        Session.create(createProps({ disciplineTypeKey: key }))
          .disciplineTypeKey,
      ).toBe(key);
    });

    it.each([
      ['chaîne vide', ''],
      ['espaces seuls', '   '],
      [
        `clé de plus de ${DISCIPLINE_MAX_LENGTH} caractères`,
        'a'.repeat(DISCIPLINE_MAX_LENGTH + 1),
      ],
    ])(
      'refuse une clé de discipline %s avec SESSION_INVALID',
      (_label, key) => {
        const error = captureError(() =>
          Session.create(createProps({ disciplineTypeKey: key })),
        );

        expect(error).toBeInstanceOf(InvalidSessionError);
        expect(error).toMatchObject({ code: 'SESSION_INVALID' });
      },
    );

    it.each([
      ['la borne basse', 1],
      ['la borne haute', DURATION_MAX],
    ])('accepte une durée correspondant à %s', (_label, durationMinutes) => {
      expect(
        Session.create(createProps({ durationMinutes })).durationMinutes,
      ).toBe(durationMinutes);
    });

    it.each([
      ['durée nulle', 0],
      ['durée négative', -5],
      ['durée au-delà de 1440 minutes', DURATION_MAX + 1],
      ['durée fractionnaire', 60.5],
      ['durée NaN', Number.NaN],
    ])('refuse une %s avec SESSION_INVALID', (_label, durationMinutes) => {
      expect(() => Session.create(createProps({ durationMinutes }))).toThrow(
        InvalidSessionError,
      );
    });

    it('refuse une date invalide avec SESSION_INVALID', () => {
      expect(() =>
        Session.create(createProps({ date: new Date('date invalide') })),
      ).toThrow(InvalidSessionError);
    });

    it('retire les espaces en bordure de la description', () => {
      expect(
        Session.create(createProps({ description: '  Endurance  ' }))
          .description,
      ).toBe('Endurance');
    });

    it('transforme une description composée d’espaces en absence de valeur', () => {
      expect(
        Session.create(createProps({ description: '   ' })).description,
      ).toBeNull();
    });

    it('transforme un matériel vide en absence de valeur', () => {
      expect(
        Session.create(createProps({ equipment: '' })).equipment,
      ).toBeNull();
    });

    it('transforme des points d’attention composés d’espaces en absence de valeur', () => {
      expect(
        Session.create(createProps({ attentionPoints: '   ' })).attentionPoints,
      ).toBeNull();
    });

    it(`accepte une description de ${DESCRIPTION_MAX_LENGTH} caractères`, () => {
      const description = 'a'.repeat(DESCRIPTION_MAX_LENGTH);

      expect(Session.create(createProps({ description })).description).toBe(
        description,
      );
    });

    it(`refuse une description de plus de ${DESCRIPTION_MAX_LENGTH} caractères avec SESSION_INVALID`, () => {
      expect(() =>
        Session.create(
          createProps({ description: 'a'.repeat(DESCRIPTION_MAX_LENGTH + 1) }),
        ),
      ).toThrow(InvalidSessionError);
    });

    it(`accepte un matériel de ${EQUIPMENT_MAX_LENGTH} caractères`, () => {
      const equipment = 'a'.repeat(EQUIPMENT_MAX_LENGTH);

      expect(Session.create(createProps({ equipment })).equipment).toBe(
        equipment,
      );
    });

    it(`refuse un matériel de plus de ${EQUIPMENT_MAX_LENGTH} caractères avec SESSION_INVALID`, () => {
      expect(() =>
        Session.create(
          createProps({ equipment: 'a'.repeat(EQUIPMENT_MAX_LENGTH + 1) }),
        ),
      ).toThrow(InvalidSessionError);
    });

    it(`refuse des points d’attention de plus de ${ATTENTION_POINTS_MAX_LENGTH} caractères avec SESSION_INVALID`, () => {
      expect(() =>
        Session.create(
          createProps({
            attentionPoints: 'a'.repeat(ATTENTION_POINTS_MAX_LENGTH + 1),
          }),
        ),
      ).toThrow(InvalidSessionError);
    });

    it('conserve l’ordre des modules fournis et les renumérote de 1 à n', () => {
      const session = Session.create(
        createProps({
          modules: [
            moduleAt(7, 'echauffement'),
            moduleAt(3, 'educatifs'),
            moduleAt(9, 'series'),
          ],
        }),
      );

      expect(session.modules.map((m) => [m.position, m.type])).toEqual([
        [1, 'echauffement'],
        [2, 'educatifs'],
        [3, 'series'],
      ]);
    });

    it(`refuse plus de ${MODULES_MAX} modules avec SESSION_INVALID`, () => {
      const modules = Array.from({ length: MODULES_MAX + 1 }, (_, index) =>
        moduleAt(index + 1),
      );

      expect(() => Session.create(createProps({ modules }))).toThrow(
        InvalidSessionError,
      );
    });
  });

  describe('reconstitution', () => {
    it('reconstitue la séance avec l’identifiant et le statut fournis', () => {
      const session = reconstituted({ status: 'manquee' });

      expect(session.id.toString()).toBe(SESSION_ID);
      expect(session.status).toBe('manquee');
    });

    it('reconstitue le journal existant sans le marquer comme en attente', () => {
      const session = reconstituted({
        changeLog: [
          { changedAt: NOW, field: 'durationMinutes', previousValue: '45' },
        ],
      });

      expect(session.changeLog).toEqual([
        { changedAt: NOW, field: 'durationMinutes', previousValue: '45' },
      ]);
      expect(session.pendingLogEntries).toEqual([]);
    });
  });

  describe('modification', () => {
    it('conserve l’identifiant de la séance modifiée', () => {
      const session = Session.create(createProps());

      expect(session.change({ durationMinutes: 45 }, NOW).id.toString()).toBe(
        session.id.toString(),
      );
    });

    it('positionne modifiedManually à vrai après une modification réelle', () => {
      const changed = Session.create(createProps()).change(
        { durationMinutes: 45 },
        NOW,
      );

      expect(changed.modifiedManually).toBe(true);
    });

    it('journalise la date modifiée avec sa valeur précédente au format calendaire', () => {
      const changed = Session.create(createProps()).change(
        { date: day('2026-05-05') },
        NOW,
      );

      expect(changed.date.toISOString()).toBe('2026-05-05T00:00:00.000Z');
      expect(changed.changeLog).toEqual([
        { changedAt: NOW, field: 'date', previousValue: '2026-05-04' },
      ]);
    });

    it('journalise la durée modifiée avec sa valeur précédente', () => {
      const changed = Session.create(createProps()).change(
        { durationMinutes: 45 },
        NOW,
      );

      expect(changed.durationMinutes).toBe(45);
      expect(changed.changeLog).toEqual([
        { changedAt: NOW, field: 'durationMinutes', previousValue: '60' },
      ]);
    });

    it('journalise la description modifiée et sa valeur précédente', () => {
      const session = reconstituted({ description: 'Endurance' });

      const changed = session.change({ description: 'Seuil' }, NOW);

      expect(changed.description).toBe('Seuil');
      expect(changed.changeLog).toEqual([
        { changedAt: NOW, field: 'description', previousValue: 'Endurance' },
      ]);
    });

    it('journalise une valeur précédente absente par null', () => {
      const changed = Session.create(createProps()).change(
        { description: 'Endurance' },
        NOW,
      );

      expect(changed.changeLog).toEqual([
        { changedAt: NOW, field: 'description', previousValue: null },
      ]);
    });

    it('efface la description quand elle est mise à null et journalise l’ancienne valeur', () => {
      const session = reconstituted({ description: 'Endurance' });

      const changed = session.change({ description: null }, NOW);

      expect(changed.description).toBeNull();
      expect(changed.changeLog).toEqual([
        { changedAt: NOW, field: 'description', previousValue: 'Endurance' },
      ]);
    });

    it('efface matériel et points d’attention quand ils sont mis à null', () => {
      const session = reconstituted({
        equipment: 'Palmes',
        attentionPoints: 'Épaule',
      });

      const changed = session.change(
        { equipment: null, attentionPoints: null },
        NOW,
      );

      expect(changed.equipment).toBeNull();
      expect(changed.attentionPoints).toBeNull();
    });

    it('retire les espaces de la description modifiée', () => {
      const changed = Session.create(createProps()).change(
        { description: '  Seuil  ' },
        NOW,
      );

      expect(changed.description).toBe('Seuil');
    });

    it('journalise chaque champ réellement modifié dans une même modification', () => {
      const changed = Session.create(createProps()).change(
        { durationMinutes: 45, description: 'Endurance' },
        NOW,
      );

      expect(changed.changeLog.map((entry) => entry.field)).toEqual([
        'durationMinutes',
        'description',
      ]);
    });

    it('ne journalise pas un champ dont la valeur est identique', () => {
      const changed = Session.create(createProps()).change(
        { durationMinutes: 45, disciplineTypeKey: 'swimming' },
        NOW,
      );

      expect(changed.changeLog.map((entry) => entry.field)).toEqual([
        'durationMinutes',
      ]);
    });

    it('ne journalise rien et ne positionne pas modifiedManually quand les valeurs sont identiques', () => {
      const unchanged = Session.create(
        createProps({ description: 'Endurance' }),
      ).change(
        {
          date: day('2026-05-04'),
          disciplineTypeKey: 'swimming',
          durationMinutes: 60,
          description: '  Endurance  ',
        },
        NOW,
      );

      expect(unchanged.changeLog).toEqual([]);
      expect(unchanged.pendingLogEntries).toEqual([]);
      expect(unchanged.modifiedManually).toBe(false);
    });

    it('ne journalise rien quand la modification est vide', () => {
      const unchanged = Session.create(createProps()).change({}, NOW);

      expect(unchanged.changeLog).toEqual([]);
      expect(unchanged.modifiedManually).toBe(false);
    });

    it('ne modifie pas la séance d’origine', () => {
      const session = Session.create(createProps());

      session.change({ durationMinutes: 45, description: 'Endurance' }, NOW);

      expect(session.durationMinutes).toBe(60);
      expect(session.description).toBeNull();
      expect(session.modifiedManually).toBe(false);
      expect(session.changeLog).toEqual([]);
    });

    it('passe le statut à manquee et le journalise', () => {
      const changed = Session.create(createProps()).change(
        { status: 'manquee' },
        NOW,
      );

      expect(changed.status).toBe('manquee');
      expect(changed.changeLog).toEqual([
        { changedAt: NOW, field: 'status', previousValue: 'planifiee' },
      ]);
    });

    it('passe le statut à realisee depuis planifiee', () => {
      const changed = Session.create(createProps()).change(
        { status: 'realisee' },
        NOW,
      );

      expect(changed.status).toBe('realisee');
    });

    it('accumule les entrées de journal d’une modification à l’autre', () => {
      const first = Session.create(createProps()).change(
        { durationMinutes: 45 },
        NOW,
      );

      const second = first.change({ description: 'Endurance' }, LATER);

      expect(second.changeLog.map((entry) => entry.field)).toEqual([
        'durationMinutes',
        'description',
      ]);
    });

    it('ne renvoie en attente que les entrées créées depuis le chargement', () => {
      const session = reconstituted({
        modifiedManually: true,
        changeLog: [
          { changedAt: NOW, field: 'durationMinutes', previousValue: '45' },
        ],
      });

      const changed = session.change({ description: 'Endurance' }, LATER);

      expect(changed.pendingLogEntries).toEqual([
        { changedAt: LATER, field: 'description', previousValue: null },
      ]);
      expect(changed.changeLog).toHaveLength(2);
    });

    it('garde modifiedManually à vrai pour une séance déjà modifiée manuellement', () => {
      const session = reconstituted({ modifiedManually: true });

      expect(
        session.change({ durationMinutes: 45 }, NOW).modifiedManually,
      ).toBe(true);
    });

    it.each([
      ['durée nulle', { durationMinutes: 0 }],
      ['clé de discipline vide', { disciplineTypeKey: '   ' }],
      ['statut hors valeurs', { status: 'annulee' }],
      ['date invalide', { date: new Date('date invalide') }],
      [
        'description trop longue',
        { description: 'a'.repeat(DESCRIPTION_MAX_LENGTH + 1) },
      ],
    ])(
      'refuse une modification avec %s sans rien changer',
      (_label, changes) => {
        const session = Session.create(createProps());

        expect(() => session.change(changes, NOW)).toThrow(InvalidSessionError);
        expect(session.durationMinutes).toBe(60);
        expect(session.changeLog).toEqual([]);
      },
    );
  });

  describe('garde séance réalisée', () => {
    it('refuse toute modification d’une séance réalisée avec SESSION_ALREADY_COMPLETED', () => {
      const session = reconstituted({ status: 'realisee' });

      const error = captureError(() =>
        session.change({ durationMinutes: 45 }, NOW),
      );

      expect(error).toBeInstanceOf(SessionAlreadyCompletedError);
      expect(error).toMatchObject({ code: 'SESSION_ALREADY_COMPLETED' });
    });

    it('refuse de repasser une séance réalisée au statut planifiee', () => {
      const session = reconstituted({ status: 'realisee' });

      expect(() => session.change({ status: 'planifiee' }, NOW)).toThrow(
        SessionAlreadyCompletedError,
      );
    });

    it('refuse de remplacer les modules d’une séance réalisée avec SESSION_ALREADY_COMPLETED', () => {
      const session = reconstituted({
        status: 'realisee',
        modules: [moduleAt(1, 'echauffement')],
      });

      const error = captureError(() =>
        session.replaceModules([moduleAt(1, 'retour_au_calme')], NOW),
      );

      expect(error).toBeInstanceOf(SessionAlreadyCompletedError);
      expect(error).toMatchObject({ code: 'SESSION_ALREADY_COMPLETED' });
    });

    it('laisse intacte une séance réalisée refusée à la modification', () => {
      const session = reconstituted({ status: 'realisee' });

      expect(() => session.change({ durationMinutes: 45 }, NOW)).toThrow();
      expect(session.durationMinutes).toBe(60);
      expect(session.modifiedManually).toBe(false);
    });
  });

  describe('remplacement des modules', () => {
    it('remplace la liste et renumérote les positions selon l’ordre fourni', () => {
      const session = reconstituted({
        modules: [moduleAt(1, 'echauffement'), moduleAt(2, 'series')],
      });

      const changed = session.replaceModules(
        [
          moduleAt(5, 'retour_au_calme'),
          moduleAt(2, 'series'),
          moduleAt(1, 'echauffement'),
        ],
        NOW,
      );

      expect(changed.modules.map((m) => [m.position, m.type])).toEqual([
        [1, 'retour_au_calme'],
        [2, 'series'],
        [3, 'echauffement'],
      ]);
    });

    it('positionne modifiedManually à vrai et journalise le champ modules', () => {
      const session = reconstituted({
        modules: [moduleAt(1, 'echauffement')],
      });

      const changed = session.replaceModules([moduleAt(1, 'series')], NOW);

      expect(changed.modifiedManually).toBe(true);
      expect(changed.changeLog).toHaveLength(1);
      expect(changed.changeLog[0]).toMatchObject({
        changedAt: NOW,
        field: 'modules',
      });
    });

    it('journalise dans previousValue la liste précédente des modules en JSON', () => {
      const session = reconstituted({
        modules: [moduleAt(1, 'echauffement'), moduleAt(2, 'series')],
      });

      const changed = session.replaceModules([moduleAt(1, 'autre')], NOW);
      const previous = JSON.parse(changed.changeLog[0].previousValue as string);

      expect(previous).toEqual([
        expect.objectContaining({ position: 1, type: 'echauffement' }),
        expect.objectContaining({ position: 2, type: 'series' }),
      ]);
    });

    it('ne journalise rien quand la liste remplacée est identique à la liste courante', () => {
      const session = reconstituted({
        modules: [moduleAt(1, 'echauffement'), moduleAt(2, 'series')],
      });

      const unchanged = session.replaceModules(
        [moduleAt(1, 'echauffement'), moduleAt(2, 'series')],
        NOW,
      );

      expect(unchanged.changeLog).toEqual([]);
      expect(unchanged.modifiedManually).toBe(false);
    });

    it('vide la liste quand le remplacement ne contient aucun module', () => {
      const session = reconstituted({
        modules: [moduleAt(1, 'echauffement')],
      });

      const changed = session.replaceModules([], NOW);

      expect(changed.modules).toEqual([]);
      expect(changed.modifiedManually).toBe(true);
    });

    it(`accepte ${MODULES_MAX} modules`, () => {
      const modules = Array.from({ length: MODULES_MAX }, (_, index) =>
        moduleAt(index + 1),
      );

      expect(reconstituted().replaceModules(modules, NOW).modules).toHaveLength(
        MODULES_MAX,
      );
    });

    it(`refuse plus de ${MODULES_MAX} modules avec SESSION_INVALID sans rien changer`, () => {
      const session = reconstituted({ modules: [moduleAt(1)] });
      const modules = Array.from({ length: MODULES_MAX + 1 }, (_, index) =>
        moduleAt(index + 1),
      );

      expect(() => session.replaceModules(modules, NOW)).toThrow(
        InvalidSessionError,
      );
      expect(session.modules).toHaveLength(1);
    });

    it('ne modifie pas la séance d’origine', () => {
      const session = reconstituted({
        modules: [moduleAt(1, 'echauffement')],
      });

      session.replaceModules([moduleAt(1, 'series')], NOW);

      expect(session.modules.map((m) => m.type)).toEqual(['echauffement']);
      expect(session.modifiedManually).toBe(false);
    });
  });
});
