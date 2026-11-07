import { ActivityVolume } from './activity-volume.vo.js';
import { VolumeVariation } from './volume-variation.vo.js';

function volume(
  count: number,
  durationSeconds = 0,
  distanceMeters: number | null = 0,
): ActivityVolume {
  return ActivityVolume.of({ count, durationSeconds, distanceMeters });
}

describe('VolumeVariation', () => {
  it('calcule la différence absolue et le pourcentage par rapport à la période précédente', () => {
    const variation = VolumeVariation.between(volume(3), volume(2));

    expect(variation.count).toEqual({ absolute: 1, percent: 50 });
  });

  it('calcule la variation de la durée et de la distance', () => {
    const variation = VolumeVariation.between(
      volume(1, 1800, 5000),
      volume(1, 3600, 10000),
    );

    expect(variation.durationSeconds).toEqual({
      absolute: -1800,
      percent: -50,
    });
    expect(variation.distanceMeters).toEqual({ absolute: -5000, percent: -50 });
  });

  it('renvoie une variation négative quand le volume baisse', () => {
    const variation = VolumeVariation.between(volume(1), volume(4));

    expect(variation.count).toEqual({ absolute: -3, percent: -75 });
  });

  it('renvoie un pourcentage à null quand la période précédente est vide', () => {
    const variation = VolumeVariation.between(
      volume(2, 600, 3000),
      ActivityVolume.ZERO,
    );

    expect(variation.count).toEqual({ absolute: 2, percent: null });
    expect(variation.durationSeconds).toEqual({ absolute: 600, percent: null });
    expect(variation.distanceMeters).toEqual({ absolute: 3000, percent: null });
  });

  it('renvoie un écart nul et un pourcentage à null quand les deux périodes sont vides', () => {
    const variation = VolumeVariation.between(
      ActivityVolume.ZERO,
      ActivityVolume.ZERO,
    );

    expect(variation.count).toEqual({ absolute: 0, percent: null });
  });

  it('arrondit le pourcentage à une décimale près', () => {
    const variation = VolumeVariation.between(volume(1), volume(3));

    expect(variation.count).toEqual({ absolute: -2, percent: -66.7 });
  });

  it('arrondit 33,33 % à 33,3 %', () => {
    const variation = VolumeVariation.between(volume(4), volume(3));

    expect(variation.count).toEqual({ absolute: 1, percent: 33.3 });
  });

  it('traite une distance absente comme zéro mètre dans le calcul', () => {
    const variation = VolumeVariation.between(
      ActivityVolume.of({
        count: 1,
        durationSeconds: 600,
        distanceMeters: null,
      }),
      volume(1, 600, 5000),
    );

    expect(variation.distanceMeters).toEqual({
      absolute: -5000,
      percent: -100,
    });
  });
});
