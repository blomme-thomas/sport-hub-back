import { Test } from '@nestjs/testing';
import { plainToInstance } from 'class-transformer';
import { ListDisciplinesUseCase } from '../../../application/use-cases/list-disciplines.use-case.js';
import { RenameDisciplineUseCase } from '../../../application/use-cases/rename-discipline.use-case.js';
import { DisciplineTypeKeyParamDto } from '../dtos/discipline-type-key.param.dto.js';
import { UpdateDisciplineRequestDto } from '../dtos/update-discipline.request.dto.js';
import { DisciplinesController } from './disciplines.controller.js';

const disciplineDto = {
  typeKey: 'running',
  label: 'Course à pied',
  firstSeenAt: new Date('2026-05-01T08:00:00.000Z'),
  lastSeenAt: new Date('2026-11-07T10:00:00.000Z'),
};

describe('DisciplinesController', () => {
  let controller: DisciplinesController;
  const listExecute = vi.fn();
  const renameExecute = vi.fn();

  beforeEach(async () => {
    listExecute.mockReset();
    renameExecute.mockReset();
    const moduleRef = await Test.createTestingModule({
      controllers: [DisciplinesController],
      providers: [
        { provide: ListDisciplinesUseCase, useValue: { execute: listExecute } },
        {
          provide: RenameDisciplineUseCase,
          useValue: { execute: renameExecute },
        },
      ],
    }).compile();
    controller = moduleRef.get(DisciplinesController);
  });

  describe('liste', () => {
    it('renvoie les disciplines connues dans la clé items', async () => {
      listExecute.mockResolvedValue([disciplineDto]);

      await expect(controller.list()).resolves.toEqual({
        items: [disciplineDto],
      });
    });

    it('renvoie une liste vide quand aucune discipline n’est connue', async () => {
      listExecute.mockResolvedValue([]);

      await expect(controller.list()).resolves.toEqual({ items: [] });
    });
  });

  describe('renommage', () => {
    it('transmet la clé de type et le libellé au use case et renvoie la discipline renommée', async () => {
      renameExecute.mockResolvedValue({
        ...disciplineDto,
        label: 'Course à pied',
      });
      const params = plainToInstance(DisciplineTypeKeyParamDto, {
        typeKey: 'running',
      });
      const request = plainToInstance(UpdateDisciplineRequestDto, {
        label: 'Course à pied',
      });

      const response = await controller.update(params, request);

      expect(renameExecute).toHaveBeenCalledWith({
        typeKey: 'running',
        label: 'Course à pied',
      });
      expect(response).toEqual(disciplineDto);
    });
  });
});
