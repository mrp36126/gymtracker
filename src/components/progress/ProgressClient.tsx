'use client';
import { useState } from 'react';
import ExerciseChart from './ExerciseChart';

interface LogPoint {
  date: string;
  weight: number;
  reps: number;
  sets: number;
  volume: number;
}

interface ExerciseData {
  name: string;
  muscleGroup: string;
  logs: LogPoint[];
}

interface Props {
  byExercise: Record<string, ExerciseData>;
  exerciseNames: string[];
}

type ChartMode = 'weight' | 'volume' | 'reps';

export default function ProgressClient({ byExercise, exerciseNames }: Props) {
  const [selected, setSelected] = useState<string>(exerciseNames[0]);
  const [mode, setMode] = useState<ChartMode>('weight');

  const exercise = byExercise[selected];
  const logs = exercise?.logs ?? [];

  const pr = logs.length > 0 ? Math.max(...logs.map(l => l.weight)) : 0;
  const latest = logs[logs.length - 1];
  const previous = logs[logs.length - 2];
  const trend = latest && previous
    ? latest.weight > previous.weight ? 'up'
    : latest.weight < previous.weight ? 'down' : 'same'
    : 'none';

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="w-full">
      <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-3">
        Select Exercise
      </p>

      {/* Exercise selector */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-5 scrollbar-hide -mx-4 px-4">
        {exerciseNames.map(name => (
          <button
            key={name}
            onClick={() => setSelected(name)}
            className={`flex-shrink-0 text-xs font-bold px-3 py-2 rounded-xl transition touch-manipulation ${
              selected === name
                ? 'bg-indigo-600 text-white'
                : 'bg-white/[0.06] text-white/40 hover:text-white/70 border border-white/[0.08]'
            }`}>
            {name}
          </button>
        ))}
      </div>

      {/* Exercise header */}
      {exercise && (
        <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl overflow-hidden mb-4">

          {/* PR + latest banner */}
          <div className="px-5 pt-5 pb-4 flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1">
                {exercise.muscleGroup}
              </p>
              <p className="text-2xl font-extrabold text-white tracking-tight">
                {latest ? `${latest.weight}kg` : '—'}
                {latest && (
                  <span className="text-base font-normal text-white/30 ml-2">
                    {formatDate(latest.date)}
                  </span>
                )}
              </p>
              <div className="flex items-center gap-2 mt-1.5">
                {trend === 'up' && (
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                      <path d="M5 1l4 6H1z"/>
                    </svg>
                    Improving
                  </span>
                )}
                {trend === 'down' && (
                  <span className="text-xs font-bold text-red-400 flex items-center gap-1">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                      <path d="M5 9L1 3h8z"/>
                    </svg>
                    Dropped
                  </span>
                )}
                <span className="text-xs text-white/20">{logs.length} sessions logged</span>
              </div>
            </div>

            {/* PR Badge */}
            {pr > 0 && (
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-amber-500 flex items-center justify-center mb-1">
                  <span className="text-xs font-extrabold text-amber-900">PR</span>
                </div>
                <div className="flex gap-0.5">
                  <div className="w-3 h-4 bg-amber-500 rounded-sm" style={{ clipPath: 'polygon(0 0, 100% 0, 50% 100%)' }}></div>
                  <div className="w-3 h-4 bg-amber-500 rounded-sm" style={{ clipPath: 'polygon(0 0, 100% 0, 50% 100%)' }}></div>
                </div>
                <p className="text-xs font-bold text-amber-400 mt-1">{pr}kg</p>
              </div>
            )}
          </div>

          {/* Mode tabs */}
          <div className="flex border-t border-white/[0.06]">
            {(['weight', 'volume', 'reps'] as ChartMode[]).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest transition ${
                  mode === m
                    ? 'text-indigo-400 border-b-2 border-indigo-500'
                    : 'text-white/20 hover:text-white/40'
                }`}>
                {m === 'weight' ? 'Heaviest Weight' : m === 'volume' ? 'Total Volume' : 'Best Reps'}
              </button>
            ))}
          </div>

          {/* Chart */}
          <div className="px-4 py-5">
            {logs.length < 2 ? (
              <div className="h-40 flex items-center justify-center">
                <p className="text-white/20 text-sm">Log at least 2 sessions to see your chart</p>
              </div>
            ) : (
              <ExerciseChart logs={logs} mode={mode} />
            )}
          </div>

          {/* Recent sessions table */}
          <div className="border-t border-white/[0.06] px-5 py-4">
            <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-3">Recent Sessions</p>
            <div className="space-y-2">
              {[...logs].reverse().slice(0, 5).map((log, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-xs text-white/30">{formatDate(log.date)}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-white/50">{log.sets} sets × {log.reps} reps</span>
                    <span className="text-sm font-bold text-white">{log.weight}kg</span>
                    {i === 0 && log.weight === pr && (
                      <span className="text-[9px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-full">PR</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* All exercises summary */}
      <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-3">All Exercises</p>
      <div className="space-y-2 mb-6">
        {exerciseNames.map(name => {
          const ex = byExercise[name];
          const exPr = Math.max(...ex.logs.map(l => l.weight));
          const exLatest = ex.logs[ex.logs.length - 1];
          const exPrev = ex.logs[ex.logs.length - 2];
          const exTrend = exLatest && exPrev
            ? exLatest.weight > exPrev.weight ? 'up'
            : exLatest.weight < exPrev.weight ? 'down' : 'same'
            : 'none';

          return (
            <button
              key={name}
              onClick={() => { setSelected(name); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className="w-full bg-white/[0.04] border border-white/[0.06] rounded-2xl p-4 flex items-center justify-between hover:border-white/10 transition touch-manipulation text-left">
              <div>
                <p className="text-sm font-bold text-white">{name}</p>
                <p className="text-[10px] text-white/30 uppercase tracking-widest mt-0.5">{ex.muscleGroup}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-extrabold text-white">{exLatest?.weight ?? 0}kg</p>
                  <div className="flex items-center justify-end gap-1 mt-0.5">
                    {exTrend === 'up' && <span className="text-[10px] text-emerald-400 font-bold">▲</span>}
                    {exTrend === 'down' && <span className="text-[10px] text-red-400 font-bold">▼</span>}
                    <span className="text-[10px] text-white/20">PR {exPr}kg</span>
                  </div>
                </div>
                <svg width="14" height="14" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
