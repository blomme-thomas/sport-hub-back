import { Test } from '@nestjs/testing';
import { plainToInstance } from 'class-transformer';
import { CreateSlotUseCase } from '../../../application/use-cases/create-slot.use-case.js';
import { DeleteSlotUseCase } from '../../../application/use-cases/delete-slot.use-case.js';
import { ListSlotOccurrencesUseCase } from '../../../application/use-cases/list-slot-occurrences.use-case.js';
import { UpdateSlotUseCase } from '../../../application/use-cases/update-slot.use-case.js';
import { CreateSlotRequestDto } from '../dtos/create-slot.request.dto.js';
import { ListSlotsRequestDto } from '../dtos/list-slots.request.dto.js';
import { SlotIdParamDto } from '../dtos/slot-id.param.dto.js';
import { SlotResponseDto } from '../dtos/slot.response.dto.js';
import { UpdateSlotRequestDto } from '../dtos/update-slot.request.dto.js';
import { SlotsController } from './slots.controller.js';

const slotDto = {
  id: 'slot-1',
  type: 'libre',
  date: '2026-05-04',
  startTime: '09:00',
  endTime: '10:00',
  recurrence: 'aucune',
  timeZone: 'Europe/Paris',
};

describe('SlotsController', () => {
  let controller: SlotsController;
  const createExecute = vi.fn();
  const updateExecute = vi.fn();
  const deleteExecute = vi.fn();
  const listExecute = vi.fn();

  beforeEach(async () => {
    createExecute.mockReset();
    updateExecute.mockReset();
    deleteExecute.mockReset();
    listExecute.mockReset();
    const moduleRef = await Test.createTestingModule({
      controllers: [SlotsController],
      providers: [
        { provide: CreateSlotUseCase, useValue: { execute: createExecute } },
        { provide: UpdateSlotUseCase, useValue: { execute: updateExecute } },
        { provide: DeleteSlotUseCase, useValue: { execute: deleteExecute } },
        {
          provide: ListSlotOccurrencesUseCase,
          useValue: { execute: listExecute },
        },
      ],
    }).compile();
    controller = moduleRef.get(SlotsController);
  });

  describe('création', () => {
    it('transmet la requête au use case et renvoie le créneau créé', async () => {
      createExecute.mockResolvedValue(slotDto);
      const request = plainToInstance(CreateSlotRequestDto, {
        type: 'libre',
        date: '2026-05-04',
        startTime: '09:00',
        endTime: '10:00',
      });

      const response = await controller.create(request);

      expect(createExecute).toHaveBeenCalledWith({
        type: 'libre',
        date: '2026-05-04',
        startTime: '09:00',
        endTime: '10:00',
        recurrence: undefined,
        timeZone: undefined,
      });
      expect(response).toBeInstanceOf(SlotResponseDto);
      expect(response).toEqual(slotDto);
    });
  });

  describe('lecture par période', () => {
    it('transmet la période et renvoie les occurrences', async () => {
      listExecute.mockResolvedValue({
        from: '2026-05-01',
        to: '2026-05-31',
        items: [],
      });
      const request = plainToInstance(ListSlotsRequestDto, {
        from: '2026-05-01',
        to: '2026-05-31',
      });

      const response = await controller.list(request);

      expect(listExecute).toHaveBeenCalledWith({
        from: '2026-05-01',
        to: '2026-05-31',
      });
      expect(response).toEqual({
        from: '2026-05-01',
        to: '2026-05-31',
        items: [],
      });
    });
  });

  describe('modification', () => {
    it('transmet l’identifiant et les champs modifiés au use case', async () => {
      updateExecute.mockResolvedValue({ ...slotDto, endTime: '11:00' });
      const params = plainToInstance(SlotIdParamDto, { id: 'slot-1' });
      const request = plainToInstance(UpdateSlotRequestDto, {
        endTime: '11:00',
      });

      const response = await controller.update(params, request);

      expect(updateExecute).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'slot-1', endTime: '11:00' }),
      );
      expect(response.endTime).toBe('11:00');
    });
  });

  describe('suppression', () => {
    it('transmet l’identifiant au use case sans renvoyer de corps', async () => {
      deleteExecute.mockResolvedValue(undefined);
      const params = plainToInstance(SlotIdParamDto, { id: 'slot-1' });

      await expect(controller.remove(params)).resolves.toBeUndefined();
      expect(deleteExecute).toHaveBeenCalledWith('slot-1');
    });
  });
});
