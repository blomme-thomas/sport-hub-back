import { Slot } from '../../../domain/entities/slot.entity.js';
import { LocalTime } from '../../../domain/value-objects/local-time.vo.js';
import { SlotTimeZone } from '../../../domain/value-objects/slot-time-zone.vo.js';
import { SlotMapper } from './slot.mapper.js';

function record(overrides: Record<string, unknown> = {}) {
  return {
    id: '0b8d2a3e-5a43-4a53-9b5e-0f6e1c3d9a11',
    type: 'occupe',
    date: new Date('2026-05-04T00:00:00.000Z'),
    startMinute: 540,
    endMinute: 630,
    recurrence: 'hebdomadaire',
    timeZone: 'Europe/Paris',
    createdAt: new Date('2026-05-02T00:00:00.000Z'),
    updatedAt: new Date('2026-05-02T00:00:00.000Z'),
    ...overrides,
  };
}

describe('SlotMapper', () => {
  describe('toDomain', () => {
    it('reconstitue le créneau depuis l’enregistrement', () => {
      const slot = SlotMapper.toDomain(record());

      expect(slot.id.toString()).toBe('0b8d2a3e-5a43-4a53-9b5e-0f6e1c3d9a11');
      expect(slot.type).toBe('occupe');
      expect(slot.date.toISOString()).toBe('2026-05-04T00:00:00.000Z');
      expect(slot.startTime.toString()).toBe('09:00');
      expect(slot.endTime.toString()).toBe('10:30');
      expect(slot.recurrence).toBe('hebdomadaire');
      expect(slot.timeZone.toString()).toBe('Europe/Paris');
    });
  });

  describe('toPersistence', () => {
    it('traduit le créneau en données Prisma avec les heures en minutes', () => {
      const slot = Slot.create({
        type: 'libre',
        date: new Date('2026-06-01T00:00:00.000Z'),
        startTime: LocalTime.parse('18:00'),
        endTime: LocalTime.parse('19:30'),
        recurrence: 'aucune',
        timeZone: SlotTimeZone.create('UTC'),
      });

      expect(SlotMapper.toPersistence(slot)).toEqual({
        id: slot.id.toString(),
        type: 'libre',
        date: new Date('2026-06-01T00:00:00.000Z'),
        startMinute: 1080,
        endMinute: 1170,
        recurrence: 'aucune',
        timeZone: 'UTC',
      });
    });

    it('n’inclut ni horodatages de persistance', () => {
      const data = SlotMapper.toPersistence(SlotMapper.toDomain(record()));

      expect(data).not.toHaveProperty('createdAt');
      expect(data).not.toHaveProperty('updatedAt');
    });
  });

  it('restitue un créneau équivalent après un aller-retour', () => {
    const original = SlotMapper.toDomain(record());

    const roundTrip = SlotMapper.toDomain({
      ...record(),
      ...SlotMapper.toPersistence(original),
    });

    expect(roundTrip.id.toString()).toBe(original.id.toString());
    expect(roundTrip.startTime.toString()).toBe('09:00');
    expect(roundTrip.endTime.toString()).toBe('10:30');
    expect(roundTrip.recurrence).toBe('hebdomadaire');
  });
});
