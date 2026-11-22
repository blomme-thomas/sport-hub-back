import { DisciplineLabel } from '../value-objects/discipline-label.vo.js';
import { DisciplineTypeKey } from '../value-objects/discipline-type-key.vo.js';
import { Discipline } from './discipline.entity.js';

const FIRST_SEEN = new Date('2026-05-01T08:00:00.000Z');
const EARLIER = new Date('2026-04-01T08:00:00.000Z');
const LATER = new Date('2026-06-01T08:00:00.000Z');

function firstSeenRunning(): Discipline {
  return Discipline.firstSeen(DisciplineTypeKey.create('running'), FIRST_SEEN);
}

describe('Discipline', () => {
  describe('première apparition', () => {
    it('expose la clé de type de la discipline', () => {
      expect(firstSeenRunning().typeKey.toString()).toBe('running');
    });

    it('prend la clé de type comme libellé initial', () => {
      expect(firstSeenRunning().label.toString()).toBe('running');
    });

    it('fixe la première et la dernière apparition à la date vue', () => {
      const discipline = firstSeenRunning();

      expect(discipline.firstSeenAt).toEqual(FIRST_SEEN);
      expect(discipline.lastSeenAt).toEqual(FIRST_SEEN);
    });
  });

  describe('reconstitution', () => {
    it('restitue les valeurs persistées à l’identique', () => {
      const discipline = Discipline.reconstitute({
        typeKey: DisciplineTypeKey.create('cycling'),
        label: DisciplineLabel.create('Vélo route'),
        firstSeenAt: EARLIER,
        lastSeenAt: LATER,
      });

      expect(discipline.typeKey.toString()).toBe('cycling');
      expect(discipline.label.toString()).toBe('Vélo route');
      expect(discipline.firstSeenAt).toEqual(EARLIER);
      expect(discipline.lastSeenAt).toEqual(LATER);
    });
  });

  describe('nouvelle apparition', () => {
    it('avance la dernière apparition à la date vue', () => {
      expect(firstSeenRunning().markSeen(LATER).lastSeenAt).toEqual(LATER);
    });

    it('conserve la première apparition', () => {
      expect(firstSeenRunning().markSeen(LATER).firstSeenAt).toEqual(
        FIRST_SEEN,
      );
    });

    it('ne recule jamais la dernière apparition', () => {
      expect(firstSeenRunning().markSeen(EARLIER).lastSeenAt).toEqual(
        FIRST_SEEN,
      );
    });

    it('ne modifie jamais le libellé', () => {
      const renamed = firstSeenRunning().rename(
        DisciplineLabel.create('Course à pied'),
      );

      expect(renamed.markSeen(LATER).label.toString()).toBe('Course à pied');
    });

    it('ne modifie pas la discipline d’origine', () => {
      const original = firstSeenRunning();

      original.markSeen(LATER);

      expect(original.lastSeenAt).toEqual(FIRST_SEEN);
    });
  });

  describe('renommage', () => {
    it('remplace le libellé par le libellé fourni', () => {
      const renamed = firstSeenRunning().rename(
        DisciplineLabel.create('Course à pied'),
      );

      expect(renamed.label.toString()).toBe('Course à pied');
    });

    it('conserve la clé de type et les dates d’apparition', () => {
      const renamed = firstSeenRunning().rename(
        DisciplineLabel.create('Course à pied'),
      );

      expect(renamed.typeKey.toString()).toBe('running');
      expect(renamed.firstSeenAt).toEqual(FIRST_SEEN);
      expect(renamed.lastSeenAt).toEqual(FIRST_SEEN);
    });

    it('ne modifie pas la discipline d’origine', () => {
      const original = firstSeenRunning();

      original.rename(DisciplineLabel.create('Course à pied'));

      expect(original.label.toString()).toBe('running');
    });
  });
});
