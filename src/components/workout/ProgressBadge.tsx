'use client';

interface Props {
  label: string;
  current: number;
  previous: number;
}

export default function ProgressBadge({ label, current, previous }: Props) {
  const diff = current - previous;
  const pct  = previous === 0 ? 0 : Math.round((diff / previous) * 100);
  const isUp   = diff > 0;
  const isDown = diff < 0;

  return (
    <div className={`text-center px-3 py-1.5 rounded-xl text-xs font-bold ${
      isUp   ? 'bg-emerald-500/15 text-emerald-400' :
      isDown ? 'bg-red-500/15 text-red-400' :
               'bg-white/[0.06] text-white/30'
    }`}>
      <p className="text-[9px] opacity-60 uppercase tracking-widest mb-0.5">{label}</p>
      <p>{isUp ? '▲' : isDown ? '▼' : '–'} {Math.abs(pct)}%</p>
    </div>
  );
}
