'use client';
import { useState } from 'react';
import type { WorkoutLog } from '@/types';

interface SetRow {
  id: string;
  setNumber: number;
  weight: string;
  reps: string;
  completed: boolean;
  logId?: string;
}

interface Props {
  exerciseId: string;
  defaultSets: number;
  defaultReps: string;
  lastLog: WorkoutLog | null;
  onSetComplete: (log: WorkoutLog) => void;
}

export default function SetLogger({ exerciseId, defaultSets, defaultReps, lastLog, onSetComplete }: Props) {
  const parseDefaultReps = (reps: string) => reps.includes('-') ? reps.split('-')[0] : reps;

  const initSets = (): SetRow[] =>
    Array.from({ length: defaultSets }, (_, i) => ({
      id: String(i),
      setNumber: i + 1,
      weight: lastLog ? String(lastLog.weight) : '',
      reps: parseDefaultReps(defaultReps),
      completed: false,
    }));

  const [sets, setSets] = useState<SetRow[]>(initSets);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState('');

  const updateSet = (id: string, field: 'weight' | 'reps', value: string) => {
    setSets(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const completeSet = async (setRow: SetRow) => {
    if (!setRow.weight || !setRow.reps) {
      setError('Enter weight and reps first');
      return;
    }
    setError('');
    setSaving(setRow.id);
    try {
      const res = await fetch('/api/workouts/sets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exerciseId,
          setNumber: setRow.setNumber,
          weight: parseFloat(setRow.weight),
          reps: parseInt(setRow.reps),
        }),
      });
      if (res.status === 401) {
        setError('You have been signed out. Please sign in again.');
        return;
      }
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setSets(prev => prev.map(s =>
        s.id === setRow.id ? { ...s, completed: true, logId: json.data.id } : s
      ));
      onSetComplete(json.data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(null);
    }
  };

  const addSet = () => {
    const next = sets.length + 1;
    const last = sets[sets.length - 1];
    setSets(prev => [...prev, {
      id: String(Date.now()),
      setNumber: next,
      weight: last?.weight ?? '',
      reps: last?.reps ?? parseDefaultReps(defaultReps),
      completed: false,
    }]);
  };

  const removeSet = (id: string) => {
    if (sets.length <= 1) return;
    setSets(prev => prev.filter(s => s.id !== id).map((s, i) => ({ ...s, setNumber: i + 1 })));
  };

  const completedCount = sets.filter(s => s.completed).length;

  return (
    <div className="w-full">

      {/* Progress bar */}
      {completedCount > 0 && (
        <div className="mb-3">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[10px] font-semibold text-white/30 uppercase tracking-widest">
              {completedCount} of {sets.length} sets done
            </span>
            {completedCount === sets.length && (
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
                Complete!
              </span>
            )}
          </div>
          <div className="w-full h-1 bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-500"
              style={{ width: (completedCount / sets.length * 100) + '%' }}
            />
          </div>
        </div>
      )}

      {/* Column headers */}
      <div className="grid items-center mb-1 px-1" style={{ gridTemplateColumns: '28px 1fr 1fr 1fr 36px' }}>
        <div />
        <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest text-center">Previous</p>
        <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest text-center">KG</p>
        <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest text-center">Reps</p>
        <div />
      </div>

      {/* Set rows */}
      <div className="space-y-2">
        {sets.map((setRow) => (
          <div
            key={setRow.id}
            className={`grid items-center gap-2 rounded-xl px-2 py-2.5 transition-all duration-300 ${
              setRow.completed
                ? 'bg-emerald-500/10 border border-emerald-500/20'
                : 'bg-white/[0.04] border border-white/[0.06]'
            }`}
            style={{ gridTemplateColumns: '28px 1fr 1fr 1fr 36px' }}
          >
            {/* Set number */}
            <div className="text-center">
              <span className={`text-xs font-bold ${setRow.completed ? 'text-emerald-400' : 'text-white/30'}`}>
                {setRow.setNumber}
              </span>
            </div>

            {/* Previous */}
            <div className="text-center">
              {lastLog ? (
                <span className="text-[11px] text-white/25">
                  {lastLog.weight}kg×{lastLog.reps}
                </span>
              ) : (
                <span className="text-[11px] text-white/15">—</span>
              )}
            </div>

            {/* Weight input */}
            <div className={`rounded-lg py-2 text-center border ${
              setRow.completed
                ? 'bg-emerald-500/5 border-emerald-500/10'
                : 'bg-white/[0.06] border-white/[0.08]'
            }`}>
              <input
                type="number"
                inputMode="decimal"
                step="0.5"
                min="0"
                value={setRow.weight}
                onChange={e => updateSet(setRow.id, 'weight', e.target.value)}
                disabled={setRow.completed}
                placeholder="0"
                className={`w-full bg-transparent text-sm font-bold text-center focus:outline-none placeholder:text-white/15 min-w-0 ${
                  setRow.completed ? 'text-emerald-400' : 'text-white'
                }`}
              />
            </div>

            {/* Reps input */}
            <div className={`rounded-lg py-2 text-center border ${
              setRow.completed
                ? 'bg-emerald-500/5 border-emerald-500/10'
                : 'bg-white/[0.06] border-white/[0.08]'
            }`}>
              <input
                type="number"
                inputMode="numeric"
                min="1"
                value={setRow.reps}
                onChange={e => updateSet(setRow.id, 'reps', e.target.value)}
                disabled={setRow.completed}
                placeholder="0"
                className={`w-full bg-transparent text-sm font-bold text-center focus:outline-none placeholder:text-white/15 min-w-0 ${
                  setRow.completed ? 'text-emerald-400' : 'text-white'
                }`}
              />
            </div>

            {/* Complete / remove button */}
            <div className="flex justify-center">
              {setRow.completed ? (
                <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center flex-shrink-0">
                  <svg width="14" height="14" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                </div>
              ) : (
                <button
                  onClick={() => completeSet(setRow)}
                  disabled={saving === setRow.id}
                  className="w-8 h-8 rounded-lg border-2 border-white/[0.12] flex items-center justify-center flex-shrink-0 active:scale-95 transition touch-manipulation hover:border-emerald-500/50"
                >
                  {saving === setRow.id ? (
                    <div className="w-3 h-3 border border-white/30 border-t-white/70 rounded-full animate-spin" />
                  ) : (
                    <svg width="12" height="12" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path d="M20 6L9 17l-5-5"/>
                    </svg>
                  )}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {error && <p className="text-red-400 text-xs mt-2 px-1">{error}</p>}

      {/* Add set button */}
      <button
        onClick={addSet}
        className="w-full mt-3 py-3 rounded-xl border border-dashed border-white/[0.1] text-white/30 text-xs font-semibold hover:border-white/20 hover:text-white/50 transition active:scale-98 touch-manipulation flex items-center justify-center gap-2">
        <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path d="M12 5v14M5 12h14"/>
        </svg>
        Add Set
      </button>
    </div>
  );
}
