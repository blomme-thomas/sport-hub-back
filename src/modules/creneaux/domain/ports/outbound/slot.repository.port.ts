import type { Slot } from '../../entities/slot.entity.js';
import type { SlotId } from '../../value-objects/slot-id.vo.js';
import type { SlotPeriod } from '../../value-objects/slot-period.vo.js';

export interface ISlotRepository {
  /** Renvoie le créneau portant cet identifiant, ou null s'il n'existe pas. */
  findById(id: SlotId): Promise<Slot | null>;

  /**
   * Renvoie les créneaux susceptibles d'avoir une occurrence dans la période : ponctuels dont la date est dans la période,
   * hebdomadaires dont la date d'ancrage est antérieure ou égale à la fin de période. Le filtrage fin est fait par `Slot.occurrencesIn`.
   */
  findIntersecting(period: SlotPeriod): Promise<Slot[]>;

  /** Enregistre le créneau : crée s'il est nouveau, met à jour sinon (même identifiant). */
  save(slot: Slot): Promise<void>;

  /** Supprime le créneau portant cet identifiant ; sans effet s'il n'existe pas. */
  delete(id: SlotId): Promise<void>;
}

export const SLOT_REPOSITORY = Symbol('SLOT_REPOSITORY');
