import { plainToInstance } from 'class-transformer';
import type { SessionDto } from '../../../application/dtos/session.dto.js';
import { CreateSessionRequestDto } from '../dtos/create-session.request.dto.js';
import { ListSessionsRequestDto } from '../dtos/list-sessions.request.dto.js';
import { ReplaceSessionModulesRequestDto } from '../dtos/replace-session-modules.request.dto.js';
import { UpdateSessionRequestDto } from '../dtos/update-session.request.dto.js';
import { SessionHttpMapper } from './session.http-mapper.js';

const SESSION_ID = '0f8fad5b-d9cb-469f-a165-70867728950e';

const MODULE = {
  type: 'series',
  durationMinutes: 20,
  instruction: '4 x 100 m',
  targetZones: { heartRate: { min: 140, max: 160 } },
  perceivedEffort: 7,
};

function sessionDto(overrides: Partial<SessionDto> = {}): SessionDto {
  return {
    id: SESSION_ID,
    date: '2026-05-04',
    disciplineTypeKey: 'swimming',
    durationMinutes: 60,
    status: 'planifiee',
    modifiedManually: true,
    description: 'Endurance',
    equipment: null,
    attentionPoints: null,
    modules: [
      {
        position: 1,
        type: 'series',
        durationMinutes: 20,
        instruction: '4 x 100 m',
        targetZones: { heartRate: { min: 140, max: 160 } },
        perceivedEffort: 7,
      },
      {
        position: 2,
        type: 'retour_au_calme',
        durationMinutes: 10,
        instruction: 'Nage lente',
        targetZones: null,
        perceivedEffort: null,
      },
    ],
    changeLog: [
      {
        changedAt: new Date('2026-11-08T10:00:00.000Z'),
        field: 'durationMinutes',
        previousValue: '45',
      },
    ],
    ...overrides,
  };
}

describe('SessionHttpMapper', () => {
  describe('requêtes', () => {
    it('traduit la création en commande applicative avec ses modules', () => {
      const request = plainToInstance(CreateSessionRequestDto, {
        date: '2026-05-04',
        disciplineTypeKey: 'swimming',
        durationMinutes: 60,
        description: 'Endurance',
        modules: [MODULE],
      });

      expect(SessionHttpMapper.toCreateCommand(request)).toEqual({
        date: '2026-05-04',
        disciplineTypeKey: 'swimming',
        durationMinutes: 60,
        description: 'Endurance',
        modules: [MODULE],
      });
    });

    it('traduit une création minimale sans modules ni champs facultatifs', () => {
      const request = plainToInstance(CreateSessionRequestDto, {
        date: '2026-05-04',
        disciplineTypeKey: 'swimming',
        durationMinutes: 60,
      });

      const command = SessionHttpMapper.toCreateCommand(request);

      expect(command.modules).toBeUndefined();
      expect(command.description).toBeUndefined();
    });

    it('traduit la modification en commande portant l’identifiant et les champs effacés à null', () => {
      const request = plainToInstance(UpdateSessionRequestDto, {
        durationMinutes: 45,
        description: null,
      });

      expect(
        SessionHttpMapper.toUpdateCommand(SESSION_ID, request),
      ).toMatchObject({
        id: SESSION_ID,
        durationMinutes: 45,
        description: null,
      });
    });

    it('traduit le remplacement des modules en commande portant l’identifiant et la liste ordonnée', () => {
      const request = plainToInstance(ReplaceSessionModulesRequestDto, {
        modules: [MODULE, { ...MODULE, type: 'echauffement' }],
      });

      expect(
        SessionHttpMapper.toReplaceModulesCommand(SESSION_ID, request),
      ).toEqual({
        id: SESSION_ID,
        modules: [MODULE, { ...MODULE, type: 'echauffement' }],
      });
    });

    it('traduit la période en requête applicative', () => {
      const request = plainToInstance(ListSessionsRequestDto, {
        from: '2026-05-01',
        to: '2026-05-31',
      });

      expect(SessionHttpMapper.toListQuery(request)).toEqual({
        from: '2026-05-01',
        to: '2026-05-31',
      });
    });
  });

  describe('réponses', () => {
    it('restitue une séance au format de réponse avec ses modules et son journal', () => {
      expect(SessionHttpMapper.toResponse(sessionDto())).toEqual({
        id: SESSION_ID,
        date: '2026-05-04',
        disciplineTypeKey: 'swimming',
        durationMinutes: 60,
        status: 'planifiee',
        modifiedManually: true,
        description: 'Endurance',
        equipment: null,
        attentionPoints: null,
        modules: [
          {
            position: 1,
            type: 'series',
            durationMinutes: 20,
            instruction: '4 x 100 m',
            targetZones: { heartRate: { min: 140, max: 160 } },
            perceivedEffort: 7,
          },
          {
            position: 2,
            type: 'retour_au_calme',
            durationMinutes: 10,
            instruction: 'Nage lente',
            targetZones: null,
            perceivedEffort: null,
          },
        ],
        changeLog: [
          {
            changedAt: '2026-11-08T10:00:00.000Z',
            field: 'durationMinutes',
            previousValue: '45',
          },
        ],
      });
    });

    it('restitue la date du journal en chaîne ISO', () => {
      const [entry] = SessionHttpMapper.toResponse(sessionDto()).changeLog;

      expect(entry.changedAt).toBe('2026-11-08T10:00:00.000Z');
    });

    it('restitue la liste des séances sous la clé items', () => {
      expect(
        SessionHttpMapper.toListResponse([
          sessionDto(),
          sessionDto({ id: 'autre' }),
        ]),
      ).toEqual({
        items: [
          expect.objectContaining({ id: SESSION_ID, date: '2026-05-04' }),
          expect.objectContaining({ id: 'autre' }),
        ],
      });
    });

    it('restitue une liste vide sous la clé items', () => {
      expect(SessionHttpMapper.toListResponse([])).toEqual({ items: [] });
    });
  });
});
