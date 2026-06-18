// src/types/index.ts

export interface User {
  id: string;
  name: string;
  email: string;
  supabaseId: string;
  isAdmin: boolean;
  isTrainer: boolean;
}

export interface Program {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  csvUrl?: string;
  exercises: Exercise[];
  createdAt: string;
}

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: string;
  day: string;
  order: number;
  defaultSets: number;
  defaultReps: string;
  notes?: string;
  mediaUrl?: string | null;
  detailImageUrl?: string | null;
  lastLog?: WorkoutLog | null;
}

export interface ExerciseCatalogItem {
  id: string;
  exerciseName: string;
  category: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  equipment: string;
  difficulty: string;
  description: string;
  instructions: string;
  imageUrl: string;
  detailImageUrl: string;
}

export interface WorkoutLog {
  id: string;
  weight: number;
  sets: number;
  reps: number;
  durationSeconds?: number | null;
  distanceKm?: number | null;
  notes?: string;
  loggedAt: string;
  exerciseId: string;
}

export interface ProgressPoint {
  date: string;
  volume: number;  // weight * sets * reps
  weight: number;
  sets: number;
  reps: number;
}

export type DayName =
  | 'Monday' | 'Tuesday' | 'Wednesday'
  | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  meta?: Record<string, unknown>;
}
