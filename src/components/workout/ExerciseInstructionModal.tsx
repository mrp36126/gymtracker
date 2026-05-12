'use client';

import { useEffect } from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
  name: string;
  muscleGroup: string;
  defaultSets: number;
  defaultReps: string;
  notes?: string;
  mediaUrl: string;
};

function isVideoUrl(url: string) {
  const lower = url.split('?')[0]?.toLowerCase() ?? '';
  return lower.endsWith('.mp4') || lower.endsWith('.mov') || lower.endsWith('.webm');
}

export default function ExerciseInstructionModal({
  open,
  onClose,
  name,
  muscleGroup,
  defaultSets,
  defaultReps,
  notes,
  mediaUrl,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  const video = isVideoUrl(mediaUrl);

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col bg-[#050508]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="exercise-guide-title"
    >
      <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-3 border-b border-white/[0.08] bg-[#0A0A0F]/95 backdrop-blur-xl">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold text-indigo-400 uppercase tracking-widest">Technique guide</p>
          <h2 id="exercise-guide-title" className="text-lg font-extrabold text-white truncate">
            {name}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 w-11 h-11 rounded-xl bg-white/[0.08] border border-white/[0.1] flex items-center justify-center text-white/80 hover:bg-white/[0.12] active:scale-95 transition touch-manipulation"
          aria-label="Close"
        >
          <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain min-h-0">
        <div className="w-full min-h-[40vh] bg-black flex items-center justify-center p-2">
          {video ? (
            <video
              src={mediaUrl}
              className="max-h-[min(70vh,560px)] w-full max-w-3xl object-contain"
              controls
              playsInline
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mediaUrl}
              alt={`${name} — technique`}
              className="max-h-[min(75vh,720px)] w-full max-w-3xl object-contain"
            />
          )}
        </div>

        <div className="max-w-lg mx-auto px-5 py-6 pb-16 space-y-4">
          <p className="text-xs font-semibold text-white/35 uppercase tracking-widest">{muscleGroup}</p>
          <p className="text-sm text-white/50">
            Target: <span className="text-white/80 font-semibold">{defaultSets} sets</span>
            <span className="mx-2 text-white/20">·</span>
            <span className="text-white/80 font-semibold">{defaultReps} reps</span>
          </p>
          {notes && notes.trim() ? (
            <div>
              <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-2">Details</p>
              <p className="text-sm text-white/75 leading-relaxed whitespace-pre-wrap">{notes.trim()}</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
