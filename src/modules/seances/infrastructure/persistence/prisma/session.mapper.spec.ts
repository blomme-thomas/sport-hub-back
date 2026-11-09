import { Session } from '../../../domain/entities/session.entity.js';
import { SessionId } from '../../../domain/value-objects/session-id.vo.js';
import { SessionModule } from '../../../domain/value-objects/session-module.vo.js';
import { SessionMapper } from './session.mapper.js';

const SESSION_ID = '0f8fad5b-d9cb-469f-a165-70867728950e';
const CHANGED_AT = new Date('2026-11-08T10:00:00.000Z');

function record(overrides: Record<string, unknown> = {}) {
  return {
    id: SESSION_ID,
    date: new Date('2026-05-04T00:00:00.000Z'),
    disciplineTypeKey: 'swimming',
    durationMinutes: 60,
    status: 'planifiee',
    modifiedManually: true,
    description: 'Endurance',
    equipment: null,
    attentionPoints: null,
    createdAt: new Date('2026-05-01T00:00:00.000Z'),
    updatedAt: new Date('2026-05-01T00:00:00.000Z'),
    modules: [
      {
        position: 1,
        type: 'echauffement',
        durationMinutes: 10,
        instruction: 'Nage souple',
        targetZones: null,
        perceivedEffort: null,
      },
      {
        position: 2,
        type: 'series',
        durationMinutes: 20,
        instruction: '4 x 100 m',
        targetZones: { heartRate: { min: 140, max: 160 } },
        perceivedEffort: 7,
      },
    ],
    changeLogs: [
      { changedAt: CHANGED_AT, field: 'durationMinutes', previousValue: '45' },
      { changedAt: CHANGED_AT, field: 'description', previousValue: null },
    ],
    ...overrides,
  };
}

describe('SessionMapper', () => {
  describe('toDomain', () => {
    it('reconstitue la séance avec son identifiant, sa date et son statut', () => {
      const session = SessionMapper.toDomain(record());

      expect(session.id.toString()).toBe(SESSION_ID);
      expect(session.date.toISOString()).toBe('2026-05-04T00:00:00.000Z');
      expect(session.disciplineTypeKey).toBe('swimming');
      expect(session.durationMinutes).toBe(60);
      expect(session.status).toBe('planifiee');
      expect(session.modifiedManually).toBe(true);
      expect(session.description).toBe('Endurance');
    });

    it('reconstitue les modules dans l’ordre de l’enregistrement avec leurs zones et leur effort', () => {
      const session = SessionMapper.toDomain(record());

      expect(session.modules.map((m) => [m.position, m.type])).toEqual([
        [1, 'echauffement'],
        [2, 'series'],
      ]);
      expect(session.modules[0].targetZones).toBeNull();
      expect(session.modules[1].targetZones?.toPrimitives()).toEqual({
        heartRate: { min: 140, max: 160 },
      });
      expect(session.modules[1].perceivedEffort?.value()).toBe(7);
    });

    it('reconstitue le journal existant sans entrée en attente', () => {
      const session = SessionMapper.toDomain(record());

      expect(session.changeLog).toEqual([
        {
          changedAt: CHANGED_AT,
          field: 'durationMinutes',
          previousValue: '45',
        },
        { changedAt: CHANGED_AT, field: 'description', previousValue: null },
      ]);
      expect(session.pendingLogEntries).toEqual([]);
    });

    it('reconstitue une séance sans champs facultatifs ni module', () => {
      const session = SessionMapper.toDomain(
        record({
          description: null,
          equipment: null,
          attentionPoints: null,
          modules: [],
          changeLogs: [],
        }),
      );

      expect(session.description).toBeNull();
      expect(session.equipment).toBeNull();
      expect(session.attentionPoints).toBeNull();
      expect(session.modules).toEqual([]);
      expect(session.changeLog).toEqual([]);
    });
  });

  describe('toPersistence', () => {
    it('traduit la séance en données de persistance avec ses modules', () => {
      const session = Session.reconstitute({
        id: SessionId.create(SESSION_ID),
        date: new Date('2026-05-04T00:00:00.000Z'),
        disciplineTypeKey: 'swimming',
        durationMinutes: 60,
        startTime: null,
        recurrence: 'aucune',
        targetDistanceMeters: null,
        targetHrZone1: null,
        targetHrZone2: null,
        targetHrZone3: null,
        targetHrZone4: null,
        targetHrZone5: null,
        status: 'realisee',
        modifiedManually: false,
        description: 'Endurance',
        equipment: 'Palmes',
        attentionPoints: 'Épaule',
        modules: [
          SessionModule.create({
            position: 1,
            type: 'series',
            durationMinutes: 20,
            instruction: '4 x 100 m',
            targetZones: { pace: { min: 100, max: 110 } },
            perceivedEffort: 7,
          }),
        ],
        changeLog: [],
      });

      expect(SessionMapper.toPersistence(session)).toEqual({
        activityLink: null,
        id: SESSION_ID,
        date: new Date('2026-05-04T00:00:00.000Z'),
        disciplineTypeKey: 'swimming',
        durationMinutes: 60,
        startTime: null,
        recurrence: 'aucune',
        targetDistanceMeters: null,
        targetHrZone1: null,
        targetHrZone2: null,
        targetHrZone3: null,
        targetHrZone4: null,
        targetHrZone5: null,
        status: 'realisee',
        modifiedManually: false,
        description: 'Endurance',
        equipment: 'Palmes',
        attentionPoints: 'Épaule',
        modules: [
          {
            position: 1,
            type: 'series',
            durationMinutes: 20,
            instruction: '4 x 100 m',
            targetZones: { pace: { min: 100, max: 110 } },
            perceivedEffort: 7,
          },
        ],
      });
    });

    it('traduit les textes absents en null', () => {
      const session = Session.create({
        date: new Date('2026-05-04T00:00:00.000Z'),
        disciplineTypeKey: 'swimming',
        durationMinutes: 60,
      });

      expect(SessionMapper.toPersistence(session)).toMatchObject({
        description: null,
        equipment: null,
        attentionPoints: null,
        modules: [],
      });
    });

    it('n’inclut ni journal, ni horodatages de persistance', () => {
      const data = SessionMapper.toPersistence(
        SessionMapper.toDomain(record()),
      );

      expect(data).not.toHaveProperty('changeLog');
      expect(data).not.toHaveProperty('changeLogs');
      expect(data).not.toHaveProperty('createdAt');
      expect(data).not.toHaveProperty('updatedAt');
    });
  });

  it('restitue une séance équivalente après un aller-retour', () => {
    const original = SessionMapper.toDomain(record());

    const roundTrip = SessionMapper.toDomain({
      ...record(),
      ...SessionMapper.toPersistence(original),
      changeLogs: record().changeLogs,
    });

    expect(roundTrip.id.toString()).toBe(SESSION_ID);
    expect(roundTrip.modules.map((m) => m.position)).toEqual([1, 2]);
    expect(roundTrip.modules[1].targetZones?.toPrimitives()).toEqual({
      heartRate: { min: 140, max: 160 },
    });
    expect(roundTrip.description).toBe('Endurance');
  });
});
