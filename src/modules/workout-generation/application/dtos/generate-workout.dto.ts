export interface GenerateWorkoutCommand {
  sport: string | null;
  goal: string | null;
  durationMinutes: number | null;
  weeks?: number;
}

export interface GeneratedWorkoutStepDto {
  order: number;
  label: string;
  durationMinutes: number;
  intensity: string;
  notes: string | null;
}

export interface GeneratedWorkoutDto {
  title: string;
  sport: string;
  summary: string;
  totalDurationMinutes: number;
  steps: GeneratedWorkoutStepDto[];
  basedOn: {
    weeks: number;
    from: Date | null;
    to: Date | null;
  };
}
