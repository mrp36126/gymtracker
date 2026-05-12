'use client';
import { useState } from 'react';

interface Exercise {
  id: string;
  name: string;
  day: string;
  muscleGroup: string;
  mediaUrl: string | null;
  detailMediaUrl: string | null;
}

interface Program {
  id: string;
  name: string;
  exercises: Exercise[];
}

interface Props { programs: Program[]; }

export default function MediaManager({ programs }: Props) {
  const [uploading, setUploading] = useState<{ id: string; kind: 'card' | 'detail' } | null>(null);
  const [mediaMap, setMediaMap] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    programs.forEach(p => p.exercises.forEach(ex => {
      if (ex.mediaUrl) map[ex.id] = ex.mediaUrl;
    }));
    return map;
  });
  const [detailMap, setDetailMap] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    programs.forEach(p => p.exercises.forEach(ex => {
      if (ex.detailMediaUrl) map[ex.id] = ex.detailMediaUrl;
    }));
    return map;
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleUpload = async (exerciseId: string, file: File, kind: 'card' | 'detail') => {
    setUploading({ id: exerciseId, kind });
    setError('');
    setSuccess('');
    const fd = new FormData();
    fd.append('file', file);
    fd.append('exerciseId', exerciseId);
    if (kind === 'detail') fd.append('kind', 'detail');
    try {
      const res = await fetch('/api/admin/media', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      if (kind === 'detail') {
        setDetailMap(prev => ({ ...prev, [exerciseId]: json.data.detailMediaUrl }));
      } else {
        setMediaMap(prev => ({ ...prev, [exerciseId]: json.data.mediaUrl }));
      }
      setSuccess(kind === 'detail' ? 'Technique sheet uploaded!' : 'Card media uploaded!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(null);
    }
  };

  const dayOrder = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

  const isVideoUrl = (url: string | undefined) => {
    if (!url) return false;
    const p = url.split('?')[0]?.toLowerCase() ?? '';
    return p.endsWith('.mp4') || p.endsWith('.mov') || p.endsWith('.webm');
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-white/45 leading-relaxed">
        <strong className="text-white/70">Card media</strong> is the thumbnail on the workout screen.
        <span className="mx-1.5 text-white/25">·</span>
        <strong className="text-white/70">Technique sheet</strong> opens full screen. Files are saved as{' '}
        <code className="text-indigo-400/90 text-[11px]">detail-bend-over-row-a1b2c3.jpg</code>
        -style names (detail- plus exercise slug).
      </p>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}
      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
          <p className="text-emerald-400 text-sm">{success}</p>
        </div>
      )}

      {programs.map(program => {
        const byDay = program.exercises.reduce((acc, ex) => {
          if (!acc[ex.day]) acc[ex.day] = [];
          acc[ex.day].push(ex);
          return acc;
        }, {} as Record<string, Exercise[]>);

        return (
          <div key={program.id} className="bg-white/[0.04] border border-white/[0.06] rounded-2xl overflow-hidden">
            <div className="bg-indigo-600/20 border-b border-indigo-500/20 px-5 py-3">
              <h2 className="text-white font-bold text-sm">{program.name}</h2>
            </div>

            <div className="divide-y divide-white/[0.04]">
              {dayOrder.filter(d => byDay[d]).map(day => (
                <div key={day}>
                  <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest px-5 py-2.5 bg-white/[0.02]">
                    {day}
                  </p>
                  {byDay[day].map(ex => {
                    const cardMedia = mediaMap[ex.id];
                    const detailMedia = detailMap[ex.id];
                    const busy =
                      uploading?.id === ex.id && uploading.kind === 'card';
                    const busyDetail =
                      uploading?.id === ex.id && uploading.kind === 'detail';

                    return (
                      <div key={ex.id} className="flex flex-col gap-3 px-4 py-4 min-w-0 sm:flex-row sm:items-center">
                        {/* Thumbnail — prefer card media */}
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-14 h-10 bg-white/[0.06] rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center">
                            {cardMedia ? (
                              isVideoUrl(cardMedia) ? (
                                <video src={cardMedia} className="w-full h-full object-cover" muted />
                              ) : (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={cardMedia} alt={ex.name} className="w-full h-full object-cover" />
                              )
                            ) : detailMedia ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={detailMedia} alt="" className="w-full h-full object-cover opacity-40" />
                            ) : (
                              <svg width="16" height="16" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" viewBox="0 0 24 24">
                                <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>
                              </svg>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{ex.name}</p>
                            <p className="text-[10px] text-white/30 uppercase tracking-widest mt-0.5">{ex.muscleGroup}</p>
                            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                              {cardMedia && (
                                <span className="text-[10px] text-emerald-400/90 font-semibold">Card linked</span>
                              )}
                              {detailMedia && (
                                <span className="text-[10px] text-indigo-400/90 font-semibold">Technique sheet linked</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 justify-end shrink-0">
                          <label className={`cursor-pointer text-xs px-3 py-2 rounded-xl font-bold transition ${
                            busy
                              ? 'bg-white/[0.04] text-white/20 cursor-not-allowed'
                              : cardMedia
                                ? 'bg-white/[0.06] text-white/50 hover:bg-white/10 hover:text-white/70 border border-white/[0.08]'
                                : 'bg-indigo-600 text-white hover:bg-indigo-500'
                          }`}>
                            {busy ? '…' : cardMedia ? 'Replace card' : 'Card media'}
                            <input
                              type="file"
                              accept="image/*,video/*"
                              className="hidden"
                              disabled={busy}
                              onChange={e => {
                                const file = e.target.files?.[0];
                                if (file) handleUpload(ex.id, file, 'card');
                                e.target.value = '';
                              }}
                            />
                          </label>

                          <label className={`cursor-pointer text-xs px-3 py-2 rounded-xl font-bold transition border ${
                            busyDetail
                              ? 'bg-white/[0.04] text-white/20 cursor-not-allowed border-white/[0.06]'
                              : detailMedia
                                ? 'bg-purple-500/15 text-purple-200 hover:bg-purple-500/25 border-purple-500/25'
                                : 'bg-purple-600/80 text-white hover:bg-purple-500 border-purple-400/30'
                          }`}>
                            {busyDetail ? '…' : detailMedia ? 'Replace sheet' : 'Technique sheet'}
                            <input
                              type="file"
                              accept="image/*,video/*"
                              className="hidden"
                              disabled={busyDetail}
                              onChange={e => {
                                const file = e.target.files?.[0];
                                if (file) handleUpload(ex.id, file, 'detail');
                                e.target.value = '';
                              }}
                            />
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
