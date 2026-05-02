'use client';
import { useState } from 'react';
import type { Exercise, WorkoutLog } from '@/types';
import SetLogger from './SetLogger';
import ProgressBadge from './ProgressBadge';

interface Props { exercise: Exercise; }

export default function ExerciseCard({ exercise }: Props) {
  const [lastLog, setLastLog] = useState<WorkoutLog | null>(exercise.lastLog ?? null);
  const [newLog, setNewLog] = useState<WorkoutLog | null>(null);

  const handleSave = (log: WorkoutLog) => {
    setNewLog(log);
    setLastLog(log);
  };

  const isVideo = exercise.mediaUrl?.endsWith('.mp4') || exercise.mediaUrl?.endsWith('.mov');

  return (
    <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl overflow-hidden mb-4">

      {/* Media */}
      <div className="relative h-52 bg-[#12121A] overflow-hidden">
        {exercise.mediaUrl ? (
          isVideo ? (
            <video src={exercise.mediaUrl} className="w-full h-full object-cover" controls muted loop playsInline />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={exercise.mediaUrl} alt={exercise.name} className="w-full h-full object-contain" />
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center">
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
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="text-lg font-extrabold text-white tracking-tight">{exercise.name}</h3>
        <p className="text-xs text-white/40 mt-1 mb-4">
          Target: {exercise.defaultSets} sets × {exercise.defaultReps} reps
          {exercise.notes ? ` · ${exercise.notes}` : ''}
        </p>

        {/* Last session */}
        {lastLog && !newLog && (
          <div className="bg-white/[0.04] rounded-xl p-3.5 mb-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-1">Last Session</p>
              <p className="text-sm font-semibold text-white">
                {lastLog.weight}kg · {lastLog.sets} sets · {lastLog.reps} reps
              </p>
            </div>
          </div>
        )}

        {/* New log result */}
        {newLog && lastLog && (
          <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-3.5 mb-4 flex items-center gap-3">
            <div className="flex-1">
              <p className="text-[10px] font-semibold text-indigo-400 uppercase tracking-widest mb-1">Logged</p>
              <p className="text-sm font-semibold text-white">
                {newLog.weight}kg · {newLog.sets} sets · {newLog.reps} reps
              </p>
            </div>
            <div className="flex gap-2">
              <ProgressBadge label="Weight" current={newLog.weight} previous={lastLog.weight} />
              <ProgressBadge label="Volume"
                current={newLog.weight * newLog.sets * newLog.reps}
                previous={lastLog.weight * lastLog.sets * lastLog.reps} />
            </div>
          </div>
        )}

        <SetLogger exerciseId={exercise.id} onSave={handleSave} />
      </div>
    </div>
  );
}
