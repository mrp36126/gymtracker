'use client';

import { useEffect } from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
  name: string;
  imageUrl: string;
};

export default function ExerciseDetailImageModal({ open, onClose, name, imageUrl }: Props) {
  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[220] bg-black"
      role="dialog"
      aria-modal="true"
      aria-label={`${name} detailed exercise image`}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-zoom-out"
        aria-label="Close detailed exercise image"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt={`${name} details`} className="h-full w-full object-contain" />
      </button>

      <div className="pointer-events-none absolute left-0 right-0 top-0 bg-gradient-to-b from-black/80 to-transparent p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="min-w-0 truncate text-sm font-bold text-white">{name}</p>
          <span className="shrink-0 rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white/70">
            Tap to close
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-14 flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-black/55 text-white/90 backdrop-blur-md transition hover:bg-black/75 active:scale-95"
        aria-label="Close"
      >
        <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
