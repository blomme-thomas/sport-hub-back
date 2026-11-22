export type StatsGranularity = 'week' | 'month';

export function isStatsGranularity(value: unknown): value is StatsGranularity {
  return value === 'week' || value === 'month';
}
