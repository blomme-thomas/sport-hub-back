import { plainToInstance } from 'class-transformer';
import { CreateSlotRequestDto } from '../dtos/create-slot.request.dto.js';
import { ListSlotsRequestDto } from '../dtos/list-slots.request.dto.js';
import { UpdateSlotRequestDto } from '../dtos/update-slot.request.dto.js';
import { SlotHttpMapper } from './slot.http-mapper.js';

describe('SlotHttpMapper', () => {
  describe('requêtes', () => {
    it('traduit la création en commande applicative', () => {
      const request = plainToInstance(CreateSlotRequestDto, {
        type: 'occupe',
        date: '2026-05-04',
        startTime: '18:00',
        endTime: '19:30',
        recurrence: 'hebdomadaire',
        timeZone: 'America/New_York',
      });

      expect(SlotHttpMapper.toCreateCommand(request)).toEqual({
        type: 'occupe',
        date: '2026-05-04',
        startTime: '18:00',
        endTime: '19:30',
        recurrence: 'hebdomadaire',
        timeZone: 'America/New_York',
      });
    });

    it('traduit une création minimale sans récurrence ni fuseau', () => {
      const request = plainToInstance(CreateSlotRequestDto, {
        type: 'libre',
        date: '2026-05-04',
        startTime: '09:00',
        endTime: '10:00',
      });

      const command = SlotHttpMapper.toCreateCommand(request);

      expect(command.recurrence).toBeUndefined();
      expect(command.timeZone).toBeUndefined();
    });

    it('traduit la modification en commande portant l’identifiant', () => {
      const request = plainToInstance(UpdateSlotRequestDto, {
        endTime: '11:00',
      });

      expect(SlotHttpMapper.toUpdateCommand('slot-1', request)).toMatchObject({
        id: 'slot-1',
        endTime: '11:00',
      });
    });

    it('traduit la période en requête applicative', () => {
      const request = plainToInstance(ListSlotsRequestDto, {
        from: '2026-05-01',
        to: '2026-05-31',
      });

      expect(SlotHttpMapper.toListQuery(request)).toEqual({
        from: '2026-05-01',
        to: '2026-05-31',
      });
    });
  });

  describe('réponses', () => {
    it('restitue un créneau au format de réponse', () => {
      const response = SlotHttpMapper.toResponse({
        id: 'slot-1',
        type: 'libre',
        date: '2026-05-04',
        startTime: '09:00',
        endTime: '10:00',
        recurrence: 'aucune',
        timeZone: 'Europe/Paris',
      });

      expect(response).toEqual({
        id: 'slot-1',
        type: 'libre',
        date: '2026-05-04',
        startTime: '09:00',
        endTime: '10:00',
        recurrence: 'aucune',
        timeZone: 'Europe/Paris',
      });
    });

    it('restitue les occurrences avec leurs bornes de période', () => {
      const response = SlotHttpMapper.toOccurrencesResponse({
        from: '2026-05-01',
        to: '2026-05-31',
        items: [
          {
            slotId: 'slot-1',
            type: 'occupe',
            date: '2026-05-11',
            startTime: '09:00',
            endTime: '10:00',
            recurrence: 'hebdomadaire',
            timeZone: 'Europe/Paris',
          },
        ],
      });

      expect(response).toEqual({
        from: '2026-05-01',
        to: '2026-05-31',
        items: [
          {
            slotId: 'slot-1',
            type: 'occupe',
            date: '2026-05-11',
            startTime: '09:00',
            endTime: '10:00',
            recurrence: 'hebdomadaire',
            timeZone: 'Europe/Paris',
          },
        ],
      });
    });
  });
});
