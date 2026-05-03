'use client';
import { useState } from 'react';
import type { WorkoutLog } from '@/types';

interface Props {
  exerciseId: string;
  onSave: (log: WorkoutLog) => void;
}

export default function SetLogger({ exerciseId, onSave }: Props) {
  const [weight, setWeight] = useState('');
  const [sets, setSets]     = useState('');
  const [reps, setReps]     = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const handleSubmit = async () => {
    setError('');
    if (!weight || !sets || !reps) { setError('All fields are required'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/workouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exerciseId,
          weight: parseFloat(weight),
          sets: parseInt(sets),
          reps: parseInt(reps),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      onSave(json.data);
      setWeight(''); setSets(''); setReps('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full space-y-3">
      <div className="grid grid-cols-3 gap-2 w-full">
        {[
          { label: 'Weight (kg)', value: weight, set: setWeight, placeholder: '80' },
          { label: 'Sets', value: sets, set: setSets, placeholder: '4' },
          { label: 'Reps', value: reps, set: setReps, placeholder: '10' },
        ].map(f => (
          <div key={f.label} className="bg-white/[0.06] border border-white/[0.08] rounded-xl p-3 text-center min-w-0">
            <label className="block text-[9px] font-semibold text-white/30 uppercase tracking-widest mb-2 truncate">
              {f.label}
            </label>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step="0.5"
              className="w-full bg-transparent text-white text-base font-bold text-center focus:outline-none placeholder:text-white/20 min-w-0"
              placeholder={f.placeholder}
              value={f.value}
              onChange={e => f.set(e.target.value)}
            />
          </div>
        ))}
      </div>
      {error && <p className="text-red-400 text-xs">{error}</p>}
      <button
        onClick={handleSubmit}
        disabled={saving}
        className="w-full bg-indigo-600 active:bg-indigo-700 text-white rounded-xl py-4 text-sm font-bold tracking-wide transition disabled:opacity-50 touch-manipulation">
        {saving ? 'Saving...' : 'Log This Set'}
      </button>
    </div>
  );
}
