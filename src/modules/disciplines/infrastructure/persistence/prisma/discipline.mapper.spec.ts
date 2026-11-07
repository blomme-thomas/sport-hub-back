import { Discipline } from '../../../domain/entities/discipline.entity.js';
import { DisciplineLabel } from '../../../domain/value-objects/discipline-label.vo.js';
import { DisciplineTypeKey } from '../../../domain/value-objects/discipline-type-key.vo.js';
import { DisciplineMapper } from './discipline.mapper.js';

function record(overrides: Record<string, unknown> = {}) {
  return {
    id: '0b8d2a3e-5a43-4a53-9b5e-0f6e1c3d9a11',
    typeKey: 'running',
    label: 'Course à pied',
    firstSeenAt: new Date('2026-05-01T08:00:00.000Z'),
    lastSeenAt: new Date('2026-11-07T10:00:00.000Z'),
    createdAt: new Date('2026-05-01T08:00:00.000Z'),
    updatedAt: new Date('2026-11-07T10:00:00.000Z'),
    ...overrides,
  };
}

describe('DisciplineMapper', () => {
  describe('toDomain', () => {
    it('reconstitue la discipline depuis l’enregistrement', () => {
      const discipline = DisciplineMapper.toDomain(record());

      expect(discipline.typeKey.toString()).toBe('running');
      expect(discipline.label.toString()).toBe('Course à pied');
      expect(discipline.firstSeenAt).toEqual(
        new Date('2026-05-01T08:00:00.000Z'),
      );
      expect(discipline.lastSeenAt).toEqual(
        new Date('2026-11-07T10:00:00.000Z'),
      );
    });
  });

  describe('toPersistence', () => {
    it('traduit la discipline en données Prisma', () => {
      const discipline = Discipline.reconstitute({
        typeKey: DisciplineTypeKey.create('cycling'),
        label: DisciplineLabel.create('Vélo route'),
        firstSeenAt: new Date('2026-05-01T08:00:00.000Z'),
        lastSeenAt: new Date('2026-11-07T10:00:00.000Z'),
      });

      expect(DisciplineMapper.toPersistence(discipline)).toMatchObject({
        typeKey: 'cycling',
        label: 'Vélo route',
        firstSeenAt: new Date('2026-05-01T08:00:00.000Z'),
        lastSeenAt: new Date('2026-11-07T10:00:00.000Z'),
      });
    });

    it('n’inclut pas les horodatages de persistance', () => {
      const data = DisciplineMapper.toPersistence(
        DisciplineMapper.toDomain(record()),
      );

      expect(data).not.toHaveProperty('createdAt');
      expect(data).not.toHaveProperty('updatedAt');
    });
  });

  it('restitue une discipline équivalente après un aller-retour', () => {
    const original = DisciplineMapper.toDomain(record());

    const roundTrip = DisciplineMapper.toDomain({
      ...record(),
      ...DisciplineMapper.toPersistence(original),
    });

    expect(roundTrip.typeKey.toString()).toBe('running');
    expect(roundTrip.label.toString()).toBe('Course à pied');
    expect(roundTrip.firstSeenAt).toEqual(original.firstSeenAt);
    expect(roundTrip.lastSeenAt).toEqual(original.lastSeenAt);
  });
});
