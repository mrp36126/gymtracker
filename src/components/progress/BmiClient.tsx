'use client';

import { useEffect, useMemo, useState } from 'react';

type Props = {
  userId: string;
  userName: string;
};

type StoredBmi = {
  weightKg: string;
  heightCm: string;
  updatedAt: string;
};

function getBmiCategory(bmi: number) {
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal weight';
  if (bmi < 30) return 'Overweight';
  return 'Obesity';
}

function getBmiStorageKey(userId: string) {
  return `gymtracker.bmi.${userId}`;
}

export default function BmiClient({ userId, userName }: Props) {
  const [weightKg, setWeightKg] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [savedAt, setSavedAt] = useState('');
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(getBmiStorageKey(userId));
      if (!stored) return;
      const parsed = JSON.parse(stored) as StoredBmi;
      setWeightKg(parsed.weightKg ?? '');
      setHeightCm(parsed.heightCm ?? '');
      setSavedAt(parsed.updatedAt ?? '');
    } catch {
      // Ignore invalid local data
    }
  }, [userId]);

  const bmiResult = useMemo(() => {
    const weight = Number(weightKg);
    const heightMeters = Number(heightCm) / 100;

    if (!Number.isFinite(weight) || !Number.isFinite(heightMeters) || weight <= 0 || heightMeters <= 0) {
      return null;
    }

    const value = weight / (heightMeters * heightMeters);
    return {
      value,
      rounded: value.toFixed(1),
      category: getBmiCategory(value),
    };
  }, [heightCm, weightKg]);

  const handleSave = () => {
    const payload: StoredBmi = {
      weightKg,
      heightCm,
      updatedAt: new Date().toISOString(),
    };

    try {
      window.localStorage.setItem(getBmiStorageKey(userId), JSON.stringify(payload));
      setSavedAt(payload.updatedAt);
      setSaveMessage('Saved.');
    } catch {
      setSaveMessage('Could not save on this browser.');
    }
  };

  return (
    <div className="mx-auto w-full max-w-lg px-4 pt-6 pb-10">
      <div className="mb-5 rounded-2xl border border-cyan-500/20 bg-cyan-500/[0.06] p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-cyan-300/70">Health Metric</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-white">BMI Calculator</h1>
        <p className="mt-2 text-sm text-white/45">Capture your current weight and height to calculate BMI instantly.</p>
        <p className="mt-2 text-xs text-white/35">Signed in as {userName}</p>
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4">
        <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-white/35">Weight (kg)</label>
        <input
          type="number"
          min="1"
          step="0.1"
          value={weightKg}
          onChange={(event) => setWeightKg(event.target.value)}
          className="mb-4 w-full rounded-xl border border-white/[0.08] bg-white/[0.06] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/50"
          placeholder="e.g. 78.5"
        />

        <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-white/35">Height (cm)</label>
        <input
          type="number"
          min="1"
          step="0.1"
          value={heightCm}
          onChange={(event) => setHeightCm(event.target.value)}
          className="w-full rounded-xl border border-white/[0.08] bg-white/[0.06] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/50"
          placeholder="e.g. 175"
        />

        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            className="rounded-xl bg-cyan-600 px-4 py-3 text-sm font-extrabold text-white transition hover:bg-cyan-500"
          >
            Save Height and Weight
          </button>
          {saveMessage && <p className="text-xs text-white/45">{saveMessage}</p>}
        </div>

        {savedAt && (
          <p className="mt-3 text-xs text-white/35">
            Last saved: {new Date(savedAt).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' })}
          </p>
        )}
      </div>

      <div className="mt-4 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-white/35">Your BMI</p>
        {bmiResult ? (
          <>
            <p className="mt-2 text-4xl font-extrabold text-white">{bmiResult.rounded}</p>
            <p className="mt-1 text-sm font-semibold text-cyan-300">{bmiResult.category}</p>
            <p className="mt-3 text-xs leading-5 text-white/45">
              Formula used: BMI = weight(kg) / (height(m) * height(m)).
            </p>
          </>
        ) : (
          <p className="mt-2 text-sm text-white/45">Enter valid weight and height values to see your BMI.</p>
        )}
      </div>
    </div>
  );
}
