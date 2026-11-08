export interface ComputeFreeSlotCapacityQuery {
  from: string;
  to: string;
}

export interface FreeSlotCapacityDto {
  slotId: string;
  date: string;
  startTime: string;
  endTime: string;
  availableMinutes: number;
}
