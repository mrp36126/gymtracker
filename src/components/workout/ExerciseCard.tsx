'use client';
import { useState } from 'react';
import type { Exercise, WorkoutLog } from '@/types';
import SetLogger from './SetLogger';
import ProgressBadge from './ProgressBadge';

interface Props { exercise: Exercise; }

export default function ExerciseCard({ exercise }: Props) {
  const [lastLog, setLastLog] = useState<WorkoutLog | null>(
    exercise.lastLog ?? null
  );
  const [newLog, setNewLog] = useState<WorkoutLog | null>(null);

  const handleSave = (log: WorkoutLog) => {
    setNewLog(log);
    setLastLog(log);  // update for next save comparison
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-4">
      {/* Media */}
<div className="relative h-56 bg-gray-100 overflow-hidden rounded-t-2xl">
  {exercise.mediaUrl ? (
    exercise.mediaUrl.endsWith('.mp4') || exercise.mediaUrl.endsWith('.mov') ? (
      <video
        src={exercise.mediaUrl}
        className="w-full h-full object-cover object-center"
        controls
        muted
        loop
        playsInline
      />
    ) : (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={exercise.mediaUrl}
        alt={exercise.name}
        className="w-full h-full object-contain object-center bg-gray-100"
      />
    )
  ) : (
    <div className="w-full h-full flex items-center justify-center bg-indigo-50">
      <div className="text-center">
        <p className="text-4xl mb-1">🏋️</p>
        <p className="text-xs text-gray-400">No image yet</p>
      </div>
    </div>
  )}
  <span className="absolute top-2 right-2 bg-indigo-600 text-white text-xs px-2 py-1 rounded-full">
    {exercise.muscleGroup}
  </span>
</div>
      </div>

      <div className="p-4">
        <h3 className="font-bold text-lg text-gray-800">{exercise.name}</h3>
        <p className="text-sm text-gray-400 mb-3">
          Target: {exercise.defaultSets} sets × {exercise.defaultReps} reps
          {exercise.notes ? ` · ${exercise.notes}` : ''}
        </p>

        {/* Previous session */}
        {lastLog && !newLog && (
          <div className="bg-gray-50 rounded-xl p-3 mb-3 text-sm">
            <p className="text-gray-500 mb-1 font-medium">Last session</p>
            <p className="text-gray-700">
              {lastLog.weight}kg · {lastLog.sets} sets · {lastLog.reps} reps
            </p>
          </div>
        )}

        {/* New log + comparison */}
        {newLog && lastLog && (
          <div className="bg-green-50 rounded-xl p-3 mb-3 text-sm flex items-center gap-3">
            <div>
              <p className="font-medium text-gray-700">Logged!</p>
              <p className="text-gray-600">
                {newLog.weight}kg · {newLog.sets} sets · {newLog.reps} reps
              </p>
            </div>
            <div className="ml-auto flex gap-2">
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
