import { describe, expect, it } from 'vitest';
import { sportFamilyOf } from './sport-family.vo.js';

describe('sportFamilyOf', () => {
  it('classe les variantes de course, vélo et natation dans leur sport', () => {
    expect(sportFamilyOf('trail_running')).toBe('running');
    expect(sportFamilyOf('indoor_cycling')).toBe('cycling');
    expect(sportFamilyOf('open_water_swimming')).toBe('swimming');
  });

  it('range tout type non listé dans « other »', () => {
    expect(sportFamilyOf('strength_training')).toBe('other');
    expect(sportFamilyOf('hiking')).toBe('other');
  });
});
