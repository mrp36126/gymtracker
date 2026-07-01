'use client';

import { useWorkoutTimer } from './WorkoutTimerProvider';

interface Props {
  label: string;
}

export default function WorkoutTimerButton({ label }: Props) {
  const {
    workout,
    workoutElapsed,
    isWorkoutActive,
    startWorkout,
    stopWorkout,
  } = useWorkoutTimer();
  const isCurrentWorkout = isWorkoutActive && workout?.label === label;

  const minutes = Math.floor(workoutElapsed / 60);
  const seconds = workoutElapsed % 60;
  const elapsedLabel = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <button
      type="button"
      onClick={() => isCurrentWorkout ? stopWorkout() : startWorkout(label)}
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide transition active:scale-95 ${
        isCurrentWorkout
          ? 'border-emerald-400/30 bg-emerald-500/15 text-emerald-300'
          : 'border-white/10 bg-white/[0.04] text-white/45 hover:border-indigo-400/30 hover:text-white/75'
      }`}
    >
      {isCurrentWorkout ? (
        <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 7h10v10H7z" />
        </svg>
      ) : (
        <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.3" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M10 2h4M12 14l4-4M12 22a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z" />
        </svg>
      )}
      {isCurrentWorkout ? (
        <>
          <span>Stop</span>
          <span className="font-mono tabular-nums text-[11px] text-emerald-200">{elapsedLabel}</span>
        </>
      ) : 'Timer'}
    </button>
  );
}
