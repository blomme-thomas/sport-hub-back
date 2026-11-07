import { ActivityVolume } from './activity-volume.vo.js';

describe('ActivityVolume', () => {
  describe('ZERO', () => {
    it('vaut zéro séance, zéro seconde et zéro mètre', () => {
      expect(ActivityVolume.ZERO).toMatchObject({
        count: 0,
        durationSeconds: 0,
        distanceMeters: 0,
      });
    });
  });

  describe('of', () => {
    it('porte le nombre de séances, la durée et la distance fournis', () => {
      const volume = ActivityVolume.of({
        count: 1,
        durationSeconds: 3600,
        distanceMeters: 10000,
      });

      expect(volume).toMatchObject({
        count: 1,
        durationSeconds: 3600,
        distanceMeters: 10000,
      });
    });

    it('compte une distance absente pour zéro mètre sans retirer la séance', () => {
      const volume = ActivityVolume.of({
        count: 1,
        durationSeconds: 1200,
        distanceMeters: null,
      });

      expect(volume).toMatchObject({
        count: 1,
        durationSeconds: 1200,
        distanceMeters: 0,
      });
    });
  });

  describe('plus', () => {
    it('additionne séances, durées et distances', () => {
      const running = ActivityVolume.of({
        count: 1,
        durationSeconds: 3600,
        distanceMeters: 10000,
      });
      const cycling = ActivityVolume.of({
        count: 2,
        durationSeconds: 5400,
        distanceMeters: 40000,
      });

      expect(running.plus(cycling)).toMatchObject({
        count: 3,
        durationSeconds: 9000,
        distanceMeters: 50000,
      });
    });

    it('ne modifie aucune des deux valeurs additionnées', () => {
      const running = ActivityVolume.of({
        count: 1,
        durationSeconds: 3600,
        distanceMeters: 10000,
      });
      const cycling = ActivityVolume.of({
        count: 2,
        durationSeconds: 5400,
        distanceMeters: 40000,
      });

      running.plus(cycling);

      expect(running).toMatchObject({
        count: 1,
        durationSeconds: 3600,
        distanceMeters: 10000,
      });
      expect(cycling).toMatchObject({
        count: 2,
        durationSeconds: 5400,
        distanceMeters: 40000,
      });
    });

    it('laisse une valeur inchangée quand on y ajoute ZERO', () => {
      const running = ActivityVolume.of({
        count: 1,
        durationSeconds: 3600,
        distanceMeters: 10000,
      });

      expect(ActivityVolume.ZERO.plus(running)).toMatchObject({
        count: 1,
        durationSeconds: 3600,
        distanceMeters: 10000,
      });
      expect(running.plus(ActivityVolume.ZERO)).toMatchObject({
        count: 1,
        durationSeconds: 3600,
        distanceMeters: 10000,
      });
    });
  });
});
