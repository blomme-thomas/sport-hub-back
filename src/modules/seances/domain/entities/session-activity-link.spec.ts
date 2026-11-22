import { Session } from './session.entity.js';

const NOW = new Date('2026-11-12T20:00:00.000Z');

function seance(status?: 'planifiee' | 'realisee' | 'manquee'): Session {
  const planned = Session.create({
    date: new Date('2026-11-12T00:00:00.000Z'),
    disciplineTypeKey: 'running',
    durationMinutes: 45,
  });
  return status && status !== 'planifiee'
    ? planned.change({ status }, NOW)
    : planned;
}

describe('Session – lien vers une activité', () => {
  it('lie une activité à une séance planifiée et la passe à réalisée', () => {
    const linked = seance().linkActivity('a1', 'automatique', NOW);

    expect(linked.activityLink).toEqual({
      activityId: 'a1',
      origin: 'automatique',
      linkedAt: NOW,
    });
    expect(linked.status).toBe('realisee');
  });

  it('passe une séance manquée à réalisée lorsqu’elle est liée', () => {
    expect(seance('manquee').linkActivity('a1', 'manuel', NOW).status).toBe(
      'realisee',
    );
  });

  it('ne journalise pas le lien et ne positionne pas modifiedManually', () => {
    const linked = seance().linkActivity('a1', 'manuel', NOW);

    expect(linked.changeLog).toEqual([]);
    expect(linked.modifiedManually).toBe(false);
  });

  it('renvoie la même séance quand la même activité est déjà liée', () => {
    const linked = seance().linkActivity('a1', 'manuel', NOW);

    expect(linked.linkActivity('a1', 'manuel', NOW)).toBe(linked);
  });

  it('remplace le lien précédent par la nouvelle activité', () => {
    const relinked = seance()
      .linkActivity('a1', 'automatique', NOW)
      .linkActivity('a2', 'manuel', NOW);

    expect(relinked.activityLink?.activityId).toBe('a2');
    expect(relinked.activityLink?.origin).toBe('manuel');
  });

  it('délie l’activité en conservant le statut', () => {
    const unlinked = seance()
      .linkActivity('a1', 'manuel', NOW)
      .unlinkActivity();

    expect(unlinked.activityLink).toBeNull();
    expect(unlinked.status).toBe('realisee');
  });

  it('renvoie la même séance quand rien n’est lié', () => {
    const planned = seance();

    expect(planned.unlinkActivity()).toBe(planned);
  });
});
