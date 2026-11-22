export interface ActivitySummaryDto {
  id: string;
  garminActivityId: string;
  type: string;
  startedAt: Date;
  durationSeconds: number;
  distanceMeters: number | null;
  averageHeartRate: number | null;
}

export interface ActivityListQuery {
  page: number;
  pageSize: number;
  from?: Date;
  to?: Date;
  type?: string;
}

export interface ActivityListDto {
  items: ActivitySummaryDto[];
  page: number;
  pageSize: number;
  total: number;
}
