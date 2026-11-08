import { Test } from '@nestjs/testing';
import { plainToInstance } from 'class-transformer';
import { CreateSessionUseCase } from '../../../application/use-cases/create-session.use-case.js';
import { DeleteSessionUseCase } from '../../../application/use-cases/delete-session.use-case.js';
import { GetSessionUseCase } from '../../../application/use-cases/get-session.use-case.js';
import { ListSessionsUseCase } from '../../../application/use-cases/list-sessions.use-case.js';
import { ReplaceSessionModulesUseCase } from '../../../application/use-cases/replace-session-modules.use-case.js';
import { UpdateSessionUseCase } from '../../../application/use-cases/update-session.use-case.js';
import { CreateSessionRequestDto } from '../dtos/create-session.request.dto.js';
import { ListSessionsRequestDto } from '../dtos/list-sessions.request.dto.js';
import { ReplaceSessionModulesRequestDto } from '../dtos/replace-session-modules.request.dto.js';
import { SessionIdParamDto } from '../dtos/session-id.param.dto.js';
import { UpdateSessionRequestDto } from '../dtos/update-session.request.dto.js';
import { SessionsController } from './sessions.controller.js';

const SESSION_ID = '0f8fad5b-d9cb-469f-a165-70867728950e';

const sessionDto = {
  id: SESSION_ID,
  date: '2026-05-04',
  disciplineTypeKey: 'swimming',
  durationMinutes: 60,
  status: 'planifiee',
  modifiedManually: false,
  description: null,
  equipment: null,
  attentionPoints: null,
  modules: [],
  changeLog: [],
};

describe('SessionsController', () => {
  let controller: SessionsController;
  const createExecute = vi.fn();
  const listExecute = vi.fn();
  const getExecute = vi.fn();
  const updateExecute = vi.fn();
  const replaceExecute = vi.fn();
  const deleteExecute = vi.fn();

  beforeEach(async () => {
    createExecute.mockReset();
    listExecute.mockReset();
    getExecute.mockReset();
    updateExecute.mockReset();
    replaceExecute.mockReset();
    deleteExecute.mockReset();
    const moduleRef = await Test.createTestingModule({
      controllers: [SessionsController],
      providers: [
        { provide: CreateSessionUseCase, useValue: { execute: createExecute } },
        { provide: ListSessionsUseCase, useValue: { execute: listExecute } },
        { provide: GetSessionUseCase, useValue: { execute: getExecute } },
        { provide: UpdateSessionUseCase, useValue: { execute: updateExecute } },
        {
          provide: ReplaceSessionModulesUseCase,
          useValue: { execute: replaceExecute },
        },
        { provide: DeleteSessionUseCase, useValue: { execute: deleteExecute } },
      ],
    }).compile();
    controller = moduleRef.get(SessionsController);
  });

  describe('création', () => {
    it('transmet la requête au use case et renvoie la séance créée', async () => {
      createExecute.mockResolvedValue(sessionDto);
      const request = plainToInstance(CreateSessionRequestDto, {
        date: '2026-05-04',
        disciplineTypeKey: 'swimming',
        durationMinutes: 60,
      });

      const response = await controller.create(request);

      expect(createExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          date: '2026-05-04',
          disciplineTypeKey: 'swimming',
          durationMinutes: 60,
        }),
      );
      expect(response).toEqual(sessionDto);
    });
  });

  describe('lecture par période', () => {
    it('transmet la période et renvoie les séances sous la clé items', async () => {
      listExecute.mockResolvedValue([sessionDto]);
      const request = plainToInstance(ListSessionsRequestDto, {
        from: '2026-05-01',
        to: '2026-05-31',
      });

      const response = await controller.list(request);

      expect(listExecute).toHaveBeenCalledWith({
        from: '2026-05-01',
        to: '2026-05-31',
      });
      expect(response).toEqual({ items: [sessionDto] });
    });
  });

  describe('lecture unitaire', () => {
    it('transmet l’identifiant au use case et renvoie la séance', async () => {
      getExecute.mockResolvedValue(sessionDto);
      const params = plainToInstance(SessionIdParamDto, { id: SESSION_ID });

      const response = await controller.get(params);

      expect(getExecute).toHaveBeenCalledWith(SESSION_ID);
      expect(response).toEqual(sessionDto);
    });
  });

  describe('modification', () => {
    it('transmet l’identifiant et les champs modifiés au use case', async () => {
      updateExecute.mockResolvedValue({ ...sessionDto, durationMinutes: 45 });
      const params = plainToInstance(SessionIdParamDto, { id: SESSION_ID });
      const request = plainToInstance(UpdateSessionRequestDto, {
        durationMinutes: 45,
      });

      const response = await controller.update(params, request);

      expect(updateExecute).toHaveBeenCalledWith(
        expect.objectContaining({ id: SESSION_ID, durationMinutes: 45 }),
      );
      expect(response.durationMinutes).toBe(45);
    });
  });

  describe('remplacement des modules', () => {
    it('transmet l’identifiant et la liste ordonnée au use case', async () => {
      replaceExecute.mockResolvedValue(sessionDto);
      const params = plainToInstance(SessionIdParamDto, { id: SESSION_ID });
      const request = plainToInstance(ReplaceSessionModulesRequestDto, {
        modules: [
          {
            type: 'echauffement',
            durationMinutes: 10,
            instruction: 'Nage souple',
          },
        ],
      });

      const response = await controller.replaceModules(params, request);

      expect(replaceExecute).toHaveBeenCalledWith({
        id: SESSION_ID,
        modules: [
          expect.objectContaining({
            type: 'echauffement',
            durationMinutes: 10,
          }),
        ],
      });
      expect(response).toEqual(sessionDto);
    });
  });

  describe('suppression', () => {
    it('transmet l’identifiant au use case sans renvoyer de corps', async () => {
      deleteExecute.mockResolvedValue(undefined);
      const params = plainToInstance(SessionIdParamDto, { id: SESSION_ID });

      await expect(controller.remove(params)).resolves.toBeUndefined();
      expect(deleteExecute).toHaveBeenCalledWith(SESSION_ID);
    });
  });
});
