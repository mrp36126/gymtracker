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
    <div className={`text-center px-3 py-1 rounded-lg text-xs font-semibold ${ 
      isUp ? 'bg-green-100 text-green-700' :
      isDown ? 'bg-red-100 text-red-700' :
      'bg-gray-100 text-gray-500'
    }`}>
      <p className="text-gray-400 text-[10px]">{label}</p>
      <p>{isUp ? '▲' : isDown ? '▼' : '–'} {Math.abs(pct)}%</p>
    </div>
  );
}
