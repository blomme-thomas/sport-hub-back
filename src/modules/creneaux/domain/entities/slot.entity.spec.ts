import { InvalidSlotError } from '../errors/invalid-slot.error.js';
import { SlotEndNotAfterStartError } from '../errors/slot-end-not-after-start.error.js';
import { LocalTime } from '../value-objects/local-time.vo.js';
import type { SlotOccurrence } from '../value-objects/slot-occurrence.vo.js';
import { SlotPeriod } from '../value-objects/slot-period.vo.js';
import { SlotTimeZone } from '../value-objects/slot-time-zone.vo.js';
import { SlotId } from '../value-objects/slot-id.vo.js';
import { Slot } from './slot.entity.js';

const SLOT_ID = '0f8fad5b-d9cb-469f-a165-70867728950e';

function day(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

function period(from: string, to: string): SlotPeriod {
  return SlotPeriod.create({ from: day(from), to: day(to) });
}

function props(overrides: Record<string, unknown> = {}) {
  return {
    type: 'libre' as const,
    date: day('2026-05-04'),
    startTime: LocalTime.parse('09:00'),
    endTime: LocalTime.parse('10:00'),
    recurrence: 'aucune' as const,
    timeZone: SlotTimeZone.create('Europe/Paris'),
    ...overrides,
  };
}

function captureError(action: () => unknown): unknown {
  try {
    action();
  } catch (error) {
    return error;
  }
  throw new Error('aucune erreur levée');
}

function labels(occurrences: SlotOccurrence[]): string[] {
  return occurrences.map(
    (occurrence) =>
      `${occurrence.date.toISOString().slice(0, 10)} ${occurrence.startTime.toString()}-${occurrence.endTime.toString()}`,
  );
}

describe('Slot', () => {
  describe('création', () => {
    it('expose les valeurs fournies', () => {
      const slot = Slot.create(props());

      expect(slot.type).toBe('libre');
      expect(slot.date.toISOString()).toBe('2026-05-04T00:00:00.000Z');
      expect(slot.startTime.toString()).toBe('09:00');
      expect(slot.endTime.toString()).toBe('10:00');
      expect(slot.recurrence).toBe('aucune');
      expect(slot.timeZone.toString()).toBe('Europe/Paris');
    });

    it('attribue un identifiant distinct à chaque création', () => {
      const first = Slot.create(props());
      const second = Slot.create(props());

      expect(first.id.toString()).not.toBe(second.id.toString());
    });

    it('accepte une fin à 23:59 quand le début est 23:00', () => {
      const slot = Slot.create(
        props({
          startTime: LocalTime.parse('23:00'),
          endTime: LocalTime.parse('23:59'),
        }),
      );

      expect(slot.endTime.toString()).toBe('23:59');
    });

    it.each([
      ['fin égale au début', '09:00', '09:00'],
      ['fin antérieure au début', '10:00', '09:00'],
      ['fin à minuit d’un début à 23:59', '23:59', '00:00'],
    ])('refuse une %s avec SLOT_END_NOT_AFTER_START', (_label, start, end) => {
      const error = captureError(() =>
        Slot.create(
          props({
            startTime: LocalTime.parse(start),
            endTime: LocalTime.parse(end),
          }),
        ),
      );

      expect(error).toBeInstanceOf(SlotEndNotAfterStartError);
      expect(error).toMatchObject({ code: 'SLOT_END_NOT_AFTER_START' });
    });

    it('refuse un type hors des valeurs autorisées avec SLOT_INVALID', () => {
      expect(() => Slot.create(props({ type: 'autre' }))).toThrow(
        InvalidSlotError,
      );
    });

    it('refuse une récurrence hors des valeurs autorisées avec SLOT_INVALID', () => {
      expect(() => Slot.create(props({ recurrence: 'mensuelle' }))).toThrow(
        InvalidSlotError,
      );
    });
  });

  describe('reconstitution', () => {
    it('reconstitue un créneau avec l’identifiant fourni', () => {
      const slot = Slot.reconstitute({
        id: SlotId.create(SLOT_ID),
        ...props({ type: 'occupe', recurrence: 'hebdomadaire' }),
      });

      expect(slot.id.toString()).toBe(SLOT_ID);
      expect(slot.type).toBe('occupe');
      expect(slot.recurrence).toBe('hebdomadaire');
    });

    it('reconstitue un créneau dont les occurrences se développent comme à la création', () => {
      const slot = Slot.reconstitute({
        id: SlotId.create(SLOT_ID),
        ...props({ date: day('2026-05-04') }),
      });

      expect(
        labels(slot.occurrencesIn(period('2026-05-04', '2026-05-04'))),
      ).toEqual(['2026-05-04 09:00-10:00']);
    });
  });

  describe('modification', () => {
    it('conserve l’identifiant du créneau modifié', () => {
      const slot = Slot.create(props());

      expect(
        slot.change({ endTime: LocalTime.parse('11:00') }).id.toString(),
      ).toBe(slot.id.toString());
    });

    it('fusionne la modification avec l’état courant', () => {
      const slot = Slot.create(props());

      const changed = slot.change({ endTime: LocalTime.parse('11:00') });

      expect(changed.startTime.toString()).toBe('09:00');
      expect(changed.endTime.toString()).toBe('11:00');
      expect(changed.type).toBe('libre');
      expect(changed.recurrence).toBe('aucune');
    });

    it('ne modifie pas le créneau d’origine', () => {
      const slot = Slot.create(props());

      slot.change({ endTime: LocalTime.parse('11:00') });

      expect(slot.endTime.toString()).toBe('10:00');
    });

    it('passe un créneau ponctuel en hebdomadaire', () => {
      const slot = Slot.create(props());

      expect(slot.change({ recurrence: 'hebdomadaire' }).recurrence).toBe(
        'hebdomadaire',
      );
    });

    it('ne change rien quand la modification est vide', () => {
      const slot = Slot.create(props());

      const changed = slot.change({});

      expect(changed.startTime.toString()).toBe('09:00');
      expect(changed.endTime.toString()).toBe('10:00');
      expect(changed.date.toISOString()).toBe('2026-05-04T00:00:00.000Z');
    });

    it('refuse un début repoussé après la fin courante', () => {
      const slot = Slot.create(props());

      const error = captureError(() =>
        slot.change({ startTime: LocalTime.parse('11:00') }),
      );

      expect(error).toBeInstanceOf(SlotEndNotAfterStartError);
      expect(error).toMatchObject({ code: 'SLOT_END_NOT_AFTER_START' });
    });

    it('refuse une fin ramenée au début, sur l’état fusionné', () => {
      const slot = Slot.create(props());

      expect(() => slot.change({ endTime: LocalTime.parse('09:00') })).toThrow(
        SlotEndNotAfterStartError,
      );
    });
  });

  describe('occurrences d’un créneau ponctuel', () => {
    it('renvoie l’occurrence unique quand sa date est dans la période', () => {
      const slot = Slot.create(props());

      expect(
        labels(slot.occurrencesIn(period('2026-05-01', '2026-05-31'))),
      ).toEqual(['2026-05-04 09:00-10:00']);
    });

    it('inclut la date quand elle est égale à la borne from', () => {
      const slot = Slot.create(props());

      expect(
        labels(slot.occurrencesIn(period('2026-05-04', '2026-05-10'))),
      ).toEqual(['2026-05-04 09:00-10:00']);
    });

    it('inclut la date quand elle est égale à la borne to', () => {
      const slot = Slot.create(props());

      expect(
        labels(slot.occurrencesIn(period('2026-04-28', '2026-05-04'))),
      ).toEqual(['2026-05-04 09:00-10:00']);
    });

    it('ne renvoie rien quand la date est hors de la période', () => {
      const slot = Slot.create(props());

      expect(slot.occurrencesIn(period('2026-06-01', '2026-06-30'))).toEqual(
        [],
      );
    });

    it('porte l’identifiant et le type du créneau dans l’occurrence', () => {
      const slot = Slot.create(props({ type: 'occupe' }));

      const [occurrence] = slot.occurrencesIn(
        period('2026-05-04', '2026-05-04'),
      );

      expect(occurrence?.slotId.toString()).toBe(slot.id.toString());
      expect(occurrence?.type).toBe('occupe');
    });
  });

  describe('occurrences d’un créneau hebdomadaire', () => {
    const weekly = () =>
      Slot.create(
        props({
          type: 'occupe',
          date: day('2026-05-04'),
          recurrence: 'hebdomadaire',
        }),
      );

    it('ne renvoie rien pour une période antérieure à l’ancre', () => {
      expect(
        weekly().occurrencesIn(period('2026-04-01', '2026-04-30')),
      ).toEqual([]);
    });

    it('inclut l’ancre quand la période la contient', () => {
      expect(
        labels(weekly().occurrencesIn(period('2026-05-01', '2026-05-04'))),
      ).toEqual(['2026-05-04 09:00-10:00']);
    });

    it('renvoie une occurrence par semaine sur quatre semaines', () => {
      expect(
        labels(weekly().occurrencesIn(period('2026-05-01', '2026-05-28'))),
      ).toEqual([
        '2026-05-04 09:00-10:00',
        '2026-05-11 09:00-10:00',
        '2026-05-18 09:00-10:00',
        '2026-05-25 09:00-10:00',
      ]);
    });

    it('ne renvoie que les jours situés un nombre entier de semaines après l’ancre', () => {
      expect(
        labels(weekly().occurrencesIn(period('2026-05-06', '2026-05-12'))),
      ).toEqual(['2026-05-11 09:00-10:00']);
    });

    it('inclut la première occurrence quand elle tombe sur la borne from', () => {
      expect(
        labels(weekly().occurrencesIn(period('2026-05-11', '2026-05-11'))),
      ).toEqual(['2026-05-11 09:00-10:00']);
    });

    it('ne renvoie rien quand la période se place entre deux occurrences', () => {
      expect(
        weekly().occurrencesIn(period('2026-05-12', '2026-05-17')),
      ).toEqual([]);
    });

    it('inclut l’occurrence tombant sur la borne to', () => {
      expect(
        labels(weekly().occurrencesIn(period('2026-05-18', '2026-05-18'))),
      ).toEqual(['2026-05-18 09:00-10:00']);
    });

    it('passe le changement d’année sans décaler l’heure', () => {
      const slot = Slot.create(
        props({
          type: 'occupe',
          date: day('2026-12-28'),
          recurrence: 'hebdomadaire',
        }),
      );

      expect(
        labels(slot.occurrencesIn(period('2026-12-20', '2027-01-15'))),
      ).toEqual([
        '2026-12-28 09:00-10:00',
        '2027-01-04 09:00-10:00',
        '2027-01-11 09:00-10:00',
      ]);
    });

    it('renvoie le 29 février d’une année bissextile', () => {
      const slot = Slot.create(
        props({
          type: 'occupe',
          date: day('2028-02-22'),
          recurrence: 'hebdomadaire',
        }),
      );

      expect(
        labels(slot.occurrencesIn(period('2028-02-20', '2028-03-07'))),
      ).toEqual([
        '2028-02-22 09:00-10:00',
        '2028-02-29 09:00-10:00',
        '2028-03-07 09:00-10:00',
      ]);
    });

    it('enchaîne sur le 1er mars après un 22 février d’année non bissextile', () => {
      const slot = Slot.create(
        props({
          type: 'occupe',
          date: day('2027-02-22'),
          recurrence: 'hebdomadaire',
        }),
      );

      expect(
        labels(slot.occurrencesIn(period('2027-02-22', '2027-03-08'))),
      ).toEqual([
        '2027-02-22 09:00-10:00',
        '2027-03-01 09:00-10:00',
        '2027-03-08 09:00-10:00',
      ]);
    });

    it('porte l’identifiant du créneau sur chaque occurrence', () => {
      const slot = weekly();

      const occurrences = slot.occurrencesIn(
        period('2026-05-01', '2026-05-28'),
      );

      expect(occurrences).toHaveLength(4);
      expect(
        occurrences.every(
          (occurrence) => occurrence.slotId.toString() === slot.id.toString(),
        ),
      ).toBe(true);
    });
  });
});
