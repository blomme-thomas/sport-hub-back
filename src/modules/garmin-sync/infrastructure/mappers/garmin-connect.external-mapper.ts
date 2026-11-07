import { z } from 'zod';
import { Activity } from '../../domain/entities/activity.entity.js';
import { InvalidActivityError } from '../../domain/errors/invalid-activity.error.js';
import { GarminActivityId } from '../../domain/value-objects/garmin-activity-id.vo.js';

const GMT_TIMESTAMP = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;

const garminActivitySchema = z.object({
  activityId: z.number().int().safe().nonnegative(),
  activityType: z.object({ typeKey: z.string().min(1) }),
  startTimeGMT: z.string().regex(GMT_TIMESTAMP),
  duration: z.number().min(0),
  distance: z.number().min(0).nullish(),
});

export type GarminActivityTranslation =
  | { status: 'ok'; activity: Activity }
  | { status: 'format'; id: string }
  | { status: 'invalid'; id: string };

export class GarminConnectExternalMapper {
  static toDomain(item: unknown): GarminActivityTranslation {
    const parsed = garminActivitySchema.safeParse(item);
    if (!parsed.success) {
      return {
        status: 'format',
        id: GarminConnectExternalMapper.identify(item),
      };
    }
    const data = parsed.data;
    try {
      const activity = Activity.create({
        garminActivityId: GarminActivityId.create(String(data.activityId)),
        type: data.activityType.typeKey,
        startedAt: new Date(`${data.startTimeGMT.replace(' ', 'T')}Z`),
        durationSeconds: data.duration,
        distanceMeters: data.distance ?? null,
        sourcePayload: item,
      });
      return { status: 'ok', activity };
    } catch (error) {
      if (error instanceof InvalidActivityError) {
        return { status: 'invalid', id: String(data.activityId) };
      }
      throw error;
    }
  }

  private static identify(item: unknown): string {
    if (typeof item === 'object' && item !== null && 'activityId' in item) {
      const id = (item as { activityId: unknown }).activityId;
      if (typeof id === 'number' && Number.isSafeInteger(id)) {
        return String(id);
      }
    }
    return 'inconnu';
  }
}
