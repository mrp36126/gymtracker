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
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Weight (kg)', value: weight, set: setWeight, placeholder: 'e.g. 80' },
          { label: 'Sets', value: sets, set: setSets, placeholder: 'e.g. 4' },
          { label: 'Reps', value: reps, set: setReps, placeholder: 'e.g. 10' },
        ].map(f => (
          <div key={f.label}>
            <label className="block text-xs text-gray-500 mb-1">{f.label}</label>
            <input type="number" min={0} step="0.5"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm
                focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder={f.placeholder}
              value={f.value}
              onChange={e => f.set(e.target.value)} />
          </div>
        ))}
      </div>
      {error && <p className="text-red-500 text-xs">{error}</p>}
      <button onClick={handleSubmit} disabled={saving}
        className="w-full bg-indigo-600 text-white rounded-lg py-2 text-sm font-medium
          hover:bg-indigo-700 disabled:opacity-50 transition">
        {saving ? 'Saving…' : 'Log This Set'}
      </button>
    </div>
  );
}
