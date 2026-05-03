'use client';
import { useState } from 'react';
import type { Exercise, WorkoutLog } from '@/types';
import SetLogger from './SetLogger';

interface Props { exercise: Exercise; }

export default function ExerciseCard({ exercise }: Props) {
  const [lastLog, setLastLog] = useState<WorkoutLog | null>(exercise.lastLog ?? null);
  const [completedSets, setCompletedSets] = useState(0);

  const handleSetComplete = (log: WorkoutLog) => {
    setCompletedSets(prev => prev + 1);
    setLastLog(log);
  };

  const isVideo = exercise.mediaUrl?.endsWith('.mp4') || exercise.mediaUrl?.endsWith('.mov');

  return (
    <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl overflow-hidden mb-4 w-full">

      {/* Media */}
      <div className="relative w-full bg-[#12121A] overflow-hidden" style={{ aspectRatio: '16/9' }}>
        {exercise.mediaUrl ? (
          isVideo ? (
            <video src={exercise.mediaUrl} className="w-full h-full object-cover" controls muted loop playsInline />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={exercise.mediaUrl} alt={exercise.name} className="w-full h-full object-contain" />
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
        <span className="absolute top-3 right-3 bg-indigo-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full tracking-wide uppercase">
          {exercise.muscleGroup}
        </span>
        {completedSets > 0 && (
          <div className="absolute top-3 left-3 bg-emerald-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full">
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
