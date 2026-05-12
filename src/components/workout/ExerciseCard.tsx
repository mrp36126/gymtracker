'use client';
import { useState } from 'react';
import type { Exercise, WorkoutLog } from '@/types';
import SetLogger from './SetLogger';
import ExerciseInstructionModal from './ExerciseInstructionModal';

interface Props { exercise: Exercise; }

function mediaPath(url: string) {
  return url.split('?')[0] ?? '';
}

function isVideoFile(url: string) {
  return /\.(mp4|mov|webm)$/i.test(mediaPath(url));
}

export default function ExerciseCard({ exercise }: Props) {
  const [lastLog, setLastLog] = useState<WorkoutLog | null>(exercise.lastLog ?? null);
  const [completedSets, setCompletedSets] = useState(0);
  const [guideOpen, setGuideOpen] = useState(false);

  const handleSetComplete = (log: WorkoutLog) => {
    setCompletedSets(prev => prev + 1);
    setLastLog(log);
  };

  const thumbUrl = exercise.mediaUrl ?? '';
  const guideUrl = exercise.detailMediaUrl ?? exercise.mediaUrl ?? '';
  const isVideoThumb = thumbUrl ? isVideoFile(thumbUrl) : false;

  return (
    <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl overflow-hidden mb-4 w-full">

      {guideUrl ? (
        <ExerciseInstructionModal
          open={guideOpen}
          onClose={() => setGuideOpen(false)}
          name={exercise.name}
          muscleGroup={exercise.muscleGroup}
          defaultSets={exercise.defaultSets}
          defaultReps={exercise.defaultReps}
          notes={exercise.notes}
          guideMediaUrl={guideUrl}
        />
      ) : null}

      {/* Media */}
      <div className="relative w-full bg-[#12121A] overflow-hidden" style={{ aspectRatio: '16/9' }}>
        {thumbUrl ? (
          isVideoThumb ? (
            <>
              <video src={thumbUrl} className="w-full h-full object-cover" controls muted loop playsInline />
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
              className="relative block w-full h-full min-h-[160px] group cursor-zoom-in text-left touch-manipulation"
              aria-label={`Open technique guide for ${exercise.name}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={thumbUrl} alt="" className="w-full h-full object-cover min-h-[160px]" />
              <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent opacity-90 group-active:opacity-100 transition" />
              <span className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-600 text-white text-[11px] font-bold uppercase tracking-wide shadow-lg shadow-indigo-900/40">
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                  <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                </svg>
                Technique guide
              </span>
            </button>
          )
        ) : guideUrl ? (
          <button
            type="button"
            onClick={() => setGuideOpen(true)}
            className="relative flex w-full min-h-[160px] flex-col items-center justify-center gap-3 bg-gradient-to-b from-indigo-950/80 to-[#12121A] px-6 py-10 touch-manipulation active:scale-[0.99] transition"
            aria-label={`Open technique sheet for ${exercise.name}`}
          >
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/25 flex items-center justify-center border border-indigo-500/30">
              <svg width="28" height="28" fill="none" stroke="#a5b4fc" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
              </svg>
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wide text-indigo-300">Technique sheet</span>
            <span className="text-[10px] text-white/35 text-center max-w-[240px]">Card preview not set — open for full diagram</span>
          </button>
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ minHeight: '160px' }}>
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 flex items-center justify-center">
              <svg width="28" height="28" fill="none" stroke="#6366F1" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M6 4v16M18 4v16M6 12h12M2 9h4M18 9h4M2 15h4M18 15h4"/>
              </svg>
            </div>
          </div>
        )}
        <span className="absolute top-3 right-3 bg-indigo-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full tracking-wide uppercase pointer-events-none z-[5]">
          {exercise.muscleGroup}
        </span>
        {completedSets > 0 && (
          <div className="absolute top-3 left-3 bg-emerald-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full pointer-events-none z-[5]">
            {completedSets} sets done
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">

        {/* Exercise header */}
        <div className="flex items-start justify-between mb-1">
          <h3 className="text-base font-extrabold text-white tracking-tight flex-1 pr-2">{exercise.name}</h3>
        </div>
        <p className="text-xs text-white/30 mb-4">
          {exercise.defaultSets} sets · {exercise.defaultReps} reps target
          {exercise.notes ? ` · ${exercise.notes}` : ''}
        </p>

        <SetLogger
          exerciseId={exercise.id}
          defaultSets={exercise.defaultSets}
          defaultReps={exercise.defaultReps}
          lastLog={lastLog}
          onSetComplete={handleSetComplete}
        />
      </div>
    </div>
  );
}
