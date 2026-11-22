import { InvalidActivityError } from '../errors/invalid-activity.error.js';
import { GarminActivityId } from './garmin-activity-id.vo.js';

describe('GarminActivityId', () => {
  it('conserve la valeur fournie', () => {
    expect(GarminActivityId.create('12345678901').toString()).toBe(
      '12345678901',
    );
  });

  it('retire les espaces autour de la valeur', () => {
    expect(GarminActivityId.create('  12345  ').toString()).toBe('12345');
  });

  it.each([
    ['chaîne vide', ''],
    ['espaces seuls', '   '],
    ['tabulation', '\t'],
  ])('refuse une valeur vide (%s) avec ACTIVITY_INVALID', (_label, value) => {
    expect(() => GarminActivityId.create(value)).toThrow(InvalidActivityError);
  });

  it('considère égaux deux identifiants de même valeur', () => {
    expect(
      GarminActivityId.create('42').equals(GarminActivityId.create('42')),
    ).toBe(true);
  });

  it('considère égaux deux identifiants qui ne diffèrent que par les espaces', () => {
    expect(
      GarminActivityId.create(' 42 ').equals(GarminActivityId.create('42')),
    ).toBe(true);
  });

  it('considère différents deux identifiants de valeurs distinctes', () => {
    expect(
      GarminActivityId.create('42').equals(GarminActivityId.create('43')),
    ).toBe(false);
  });
});
