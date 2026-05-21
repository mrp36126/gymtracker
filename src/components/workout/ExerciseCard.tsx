'use client';
import { useState } from 'react';
import type { Exercise, WorkoutLog } from '@/types';
import SetLogger from './SetLogger';
import ExerciseInstructionModal from './ExerciseInstructionModal';
import { useWorkoutTimer } from '@/components/timer/WorkoutTimerProvider';

interface Props { exercise: Exercise; }

function DetailImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(!src);

  if (failed) {
    return (
      <div className="flex aspect-[16/9] w-full items-center justify-center rounded-xl border border-white/[0.06] bg-[#12121A]">
        <svg width="24" height="24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2" viewBox="0 0 24 24">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="m21 15-5-5L5 21" />
        </svg>
      </div>
    );
  }

  return (
    <div className="aspect-[16/9] w-full overflow-hidden rounded-xl border border-white/[0.06] bg-[#12121A]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="h-full w-full object-contain" onError={() => setFailed(true)} />
    </div>
  );
}

function getExerciseTargetLabel(muscleGroup: string, defaultReps: string) {
  const normalized = muscleGroup.trim().toLowerCase().replace(/[^a-z0-9]/g, '');

  if (['running', 'rowing', 'cycling', 'skierg'].includes(normalized)) {
    return 'time and distance target';
  }

  if (['sledpush', 'sledpull', 'farmers'].includes(normalized)) {
    return 'weight and distance target';
  }

  if (normalized === 'burpee') {
    return 'reps target';
  }

  return `${defaultReps} reps target`;
}

export default function ExerciseCard({ exercise }: Props) {
  const [lastLog, setLastLog] = useState<WorkoutLog | null>(exercise.lastLog ?? null);
  const [completedSets, setCompletedSets] = useState(0);
  const [guideOpen, setGuideOpen] = useState(false);
  const { activeExerciseId, startExercise, stopExercise } = useWorkoutTimer();

  const handleSetComplete = (log: WorkoutLog) => {
    setCompletedSets(prev => prev + 1);
    setLastLog(log);
  };

  const mediaUrl = exercise.mediaUrl ?? '';
  const detailImageUrl = exercise.detailImageUrl ?? '';
  const mediaPath = mediaUrl.split('?')[0] ?? '';
  const isVideo = /\.(mp4|mov|webm)$/i.test(mediaPath);
  const isExerciseTimerActive = activeExerciseId === exercise.id;
  const targetLabel = getExerciseTargetLabel(exercise.muscleGroup, exercise.defaultReps);

  return (
    <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl overflow-hidden mb-4 w-full">

      {mediaUrl ? (
        <ExerciseInstructionModal
          open={guideOpen}
          onClose={() => setGuideOpen(false)}
          name={exercise.name}
          muscleGroup={exercise.muscleGroup}
          defaultSets={exercise.defaultSets}
          defaultReps={exercise.defaultReps}
          notes={exercise.notes}
          mediaUrl={mediaUrl}
        />
      ) : null}
      {/* Media */}
      <div className="relative w-full min-h-[160px] bg-[#12121A] overflow-hidden" style={{ aspectRatio: '16/9' }}>
        {mediaUrl ? (
          isVideo ? (
            <>
              <video src={mediaUrl} className="w-full h-full object-contain" controls muted loop playsInline />
              <button
                type="button"
                onClick={() => setGuideOpen(true)}
                className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5 rounded-full bg-black/55 backdrop-blur-md border border-white/15 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-white hover:bg-black/70 active:scale-95 transition touch-manipulation"
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                </svg>
                Full guide
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setGuideOpen(true)}
              className="relative block w-full h-full group text-left touch-manipulation"
              aria-label={`Open technique guide for ${exercise.name}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={mediaUrl} alt="" className="w-full h-full object-contain" />
              <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent opacity-90 group-active:opacity-100 transition" />
              <span className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-600 text-white text-[11px] font-bold uppercase tracking-wide shadow-lg shadow-indigo-900/40">
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                  <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                </svg>
                Technique guide
              </span>
            </button>
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ minHeight: '160px' }}>
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 flex items-center justify-center">
              <svg width="28" height="28" fill="none" stroke="#6366F1" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M6 4v16M18 4v16M6 12h12M2 9h4M18 9h4M2 15h4M18 15h4"/>
              </svg>
            </div>
          </div>
        )}
        <span className="absolute top-3 right-3 bg-indigo-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full tracking-wide uppercase pointer-events-none">
          {exercise.muscleGroup}
        </span>
        {completedSets > 0 && (
          <div className="absolute top-3 left-3 bg-emerald-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full pointer-events-none">
            {completedSets} sets done
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">

        {/* Exercise header */}
        <div className="flex items-start justify-between gap-3 mb-1">
          <h3 className="text-base font-extrabold text-white tracking-tight flex-1 pr-2">{exercise.name}</h3>
          <button
            type="button"
            onClick={() => isExerciseTimerActive ? stopExercise() : startExercise(exercise.id, exercise.name)}
            className={`flex flex-shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide transition active:scale-95 ${
              isExerciseTimerActive
                ? 'border-emerald-400/30 bg-emerald-500/15 text-emerald-300'
                : 'border-white/10 bg-white/[0.04] text-white/40 hover:border-indigo-400/30 hover:text-white/70'
            }`}
            aria-pressed={isExerciseTimerActive}
            aria-label={`${isExerciseTimerActive ? 'Stop' : 'Start'} timer for ${exercise.name}`}
          >
            {isExerciseTimerActive ? (
              <svg width="11" height="11" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M7 7h10v10H7z" />
              </svg>
            ) : (
              <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M10 2h4M12 14l4-4M12 22a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z" />
              </svg>
            )}
            {isExerciseTimerActive ? 'Stop' : 'Time'}
          </button>
        </div>
        <p className="text-xs text-white/30 mb-4">
          {exercise.defaultSets} sets - {targetLabel}
        </p>

        <details className="mb-4 rounded-xl border border-white/[0.06] bg-black/10 px-3 py-2">
          <summary className="cursor-pointer text-xs font-bold text-white/60">Instructions and details</summary>
          {exercise.notes?.trim() ? (
            <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-white/45">{exercise.notes.trim()}</p>
          ) : (
            <p className="mt-2 text-xs leading-5 text-white/35">No extra instructions have been added for this exercise yet.</p>
          )}

          {detailImageUrl ? (
            <div className="mt-3">
              <DetailImage
                src={detailImageUrl}
                alt={`${exercise.name} details`}
              />
            </div>
          ) : null}

          {mediaUrl ? (
            <button
              type="button"
              onClick={() => setGuideOpen(true)}
              className="mt-3 inline-flex rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs font-bold text-white/55 transition hover:bg-white/[0.08] hover:text-white/75"
            >
              {isVideo ? 'Open full guide' : 'Open exercise image'}
            </button>
          ) : null}
        </details>

        <SetLogger
          exerciseId={exercise.id}
          muscleGroup={exercise.muscleGroup}
          defaultSets={exercise.defaultSets}
          defaultReps={exercise.defaultReps}
          lastLog={lastLog}
          onSetComplete={handleSetComplete}
        />
      </div>
    </div>
  );
}
