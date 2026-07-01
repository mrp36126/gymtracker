'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

interface ActiveTimer {
  label: string;
  startedAt: number;
}

interface ExerciseTimer extends ActiveTimer {
  exerciseId: string;
}

interface TimerState {
  workout: ActiveTimer | null;
  exercise: ExerciseTimer | null;
}

interface WorkoutTimerContextValue extends TimerState {
  workoutElapsed: number;
  exerciseElapsed: number;
  isWorkoutActive: boolean;
  activeExerciseId: string | null;
  startWorkout: (label: string) => void;
  stopWorkout: () => void;
  startExercise: (exerciseId: string, label: string) => void;
  stopExercise: () => void;
}

const STORAGE_KEY = 'gymtracker-active-timers';

const WorkoutTimerContext = createContext<WorkoutTimerContextValue | null>(null);

function formatElapsed(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function getElapsed(startedAt?: number, now = Date.now()) {
  if (!startedAt) return 0;
  return Math.max(0, Math.floor((now - startedAt) / 1000));
}

function readStoredTimers(): TimerState {
  if (typeof window === 'undefined') {
    return { workout: null, exercise: null };
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return { workout: null, exercise: null };

    const parsed = JSON.parse(stored) as TimerState;
    return {
      workout: parsed.workout?.startedAt ? parsed.workout : null,
      exercise: parsed.exercise?.startedAt ? parsed.exercise : null,
    };
  } catch {
    return { workout: null, exercise: null };
  }
}

export function WorkoutTimerProvider({ children }: { children: ReactNode }) {
  const [timers, setTimers] = useState<TimerState>({ workout: null, exercise: null });
  const [now, setNow] = useState(() => Date.now());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setTimers(readStoredTimers());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(timers));
  }, [hydrated, timers]);

  useEffect(() => {
    if (!timers.workout && !timers.exercise) return;

    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [timers.workout, timers.exercise]);

  const startWorkout = useCallback((label: string) => {
    setTimers(prev => ({
      ...prev,
      workout: { label, startedAt: Date.now() },
    }));
    setNow(Date.now());
  }, []);

  const stopWorkout = useCallback(() => {
    setTimers(prev => ({ ...prev, workout: null }));
  }, []);

  const startExercise = useCallback((exerciseId: string, label: string) => {
    setTimers(prev => ({
      ...prev,
      exercise: { exerciseId, label, startedAt: Date.now() },
    }));
    setNow(Date.now());
  }, []);

  const stopExercise = useCallback(() => {
    setTimers(prev => ({ ...prev, exercise: null }));
  }, []);

  const value = useMemo<WorkoutTimerContextValue>(() => ({
    ...timers,
    workoutElapsed: getElapsed(timers.workout?.startedAt, now),
    exerciseElapsed: getElapsed(timers.exercise?.startedAt, now),
    isWorkoutActive: Boolean(timers.workout),
    activeExerciseId: timers.exercise?.exerciseId ?? null,
    startWorkout,
    stopWorkout,
    startExercise,
    stopExercise,
  }), [now, startExercise, startWorkout, stopExercise, stopWorkout, timers]);

  return (
    <WorkoutTimerContext.Provider value={value}>
      {children}
      <FloatingWorkoutTimer />
    </WorkoutTimerContext.Provider>
  );
}

export function useWorkoutTimer() {
  const context = useContext(WorkoutTimerContext);
  if (!context) {
    throw new Error('useWorkoutTimer must be used within WorkoutTimerProvider');
  }
  return context;
}

function FloatingWorkoutTimer() {
  const {
    exercise,
    exerciseElapsed,
    stopExercise,
  } = useWorkoutTimer();

  if (!exercise) return null;

  return (
    <aside className="fixed left-1/2 top-3 z-50 w-[calc(100vw-1.5rem)] max-w-sm -translate-x-1/2 rounded-2xl border border-white/10 bg-[#111119]/95 px-3 py-2 shadow-2xl shadow-black/40 backdrop-blur-xl sm:left-auto sm:right-4 sm:top-4 sm:w-auto sm:min-w-72 sm:translate-x-0">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-300">
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M10 2h4M12 14l4-4M12 22a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z" />
          </svg>
        </div>

        <div className="grid min-w-0 flex-1 gap-1">
          {exercise && (
            <TimerLine
              label={exercise.label}
              value={formatElapsed(exerciseElapsed)}
              onStop={stopExercise}
              stopLabel="Stop exercise timer"
            />
          )}
        </div>
      </div>
    </aside>
  );
}

function TimerLine({
  label,
  value,
  onStop,
  stopLabel,
}: {
  label: string;
  value: string;
  onStop: () => void;
  stopLabel: string;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2">
      <p className="truncate text-[11px] font-semibold text-white/55">{label}</p>
      <p className="font-mono text-sm font-bold tabular-nums text-white">{value}</p>
      <button
        type="button"
        onClick={onStop}
        aria-label={stopLabel}
        title={stopLabel}
        className="flex h-6 w-6 items-center justify-center rounded-lg border border-white/10 text-white/35 transition hover:border-white/20 hover:text-white/70 active:scale-95"
      >
        <svg width="10" height="10" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 7h10v10H7z" />
        </svg>
      </button>
    </div>
  );
}
