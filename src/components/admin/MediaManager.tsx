'use client';
import { useState } from 'react';

interface Exercise {
  id: string;
  name: string;
  day: string;
  muscleGroup: string;
  mediaUrl: string | null;
  detailImageUrl: string | null;
}

interface Program {
  id: string;
  name: string;
  exercises: Exercise[];
}

interface Props { programs: Program[]; }

type MediaKind = 'card' | 'detail';

function isVideoUrl(url?: string) {
  const path = url?.split('?')[0]?.toLowerCase() ?? '';
  return path.endsWith('.mp4') || path.endsWith('.mov') || path.endsWith('.webm');
}

export default function MediaManager({ programs }: Props) {
  const [uploading, setUploading] = useState<string | null>(null);
  const [mediaMap, setMediaMap] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    programs.forEach(p => p.exercises.forEach(ex => {
      if (ex.mediaUrl) map[ex.id] = ex.mediaUrl;
    }));
    return map;
  });
  const [detailImageMap, setDetailImageMap] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    programs.forEach(p => p.exercises.forEach(ex => {
      if (ex.detailImageUrl) map[ex.id] = ex.detailImageUrl;
    }));
    return map;
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleUpload = async (exerciseId: string, file: File, mediaKind: MediaKind) => {
    setUploading(`${exerciseId}:${mediaKind}`);
    setError('');
    setSuccess('');
    const fd = new FormData();
    fd.append('file', file);
    fd.append('exerciseId', exerciseId);
    fd.append('mediaKind', mediaKind);
    try {
      const res = await fetch('/api/admin/media', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      if (mediaKind === 'detail') {
        setDetailImageMap(prev => ({ ...prev, [exerciseId]: json.data.detailImageUrl }));
      } else {
        setMediaMap(prev => ({ ...prev, [exerciseId]: json.data.mediaUrl }));
      }

      setSuccess(mediaKind === 'detail' ? 'Detail image uploaded successfully!' : 'Exercise media uploaded successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUploading(null);
    }
  };

  const dayOrder = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

  return (
    <div className="space-y-4">
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
                    const currentMedia = mediaMap[ex.id];
                    const detailImage = detailImageMap[ex.id];
                    const isVideo = isVideoUrl(currentMedia);
                    const isMediaUploading = uploading === `${ex.id}:card`;
                    const isDetailUploading = uploading === `${ex.id}:detail`;

                    return (
                      <div key={ex.id} className="px-4 py-4">
                        <div className="flex items-start gap-3 min-w-0">
                          {/* Thumbnail */}
                          <div className="w-14 h-10 bg-white/[0.06] rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center">
                            {currentMedia ? (
                              isVideo ? (
                                <video src={currentMedia} className="w-full h-full object-cover" muted />
                              ) : (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={currentMedia} alt={ex.name} className="w-full h-full object-cover" />
                              )
                            ) : (
                              <svg width="16" height="16" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" viewBox="0 0 24 24">
                                <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>
                              </svg>
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{ex.name}</p>
                            <p className="text-[10px] text-white/30 uppercase tracking-widest mt-0.5">{ex.muscleGroup}</p>
                            <div className="mt-1 flex flex-wrap gap-1.5">
                              {currentMedia && (
                                <span className="text-[10px] text-emerald-400 font-semibold">Card media linked</span>
                              )}
                              {detailImage && (
                                <span className="text-[10px] text-indigo-300 font-semibold">Detail image linked</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Uploads */}
                        <div className="mt-3 ml-[68px] grid grid-cols-2 gap-2">
                          <label className={`cursor-pointer text-center text-xs px-3 py-2 rounded-xl font-bold transition ${
                            isMediaUploading
                              ? 'bg-white/[0.04] text-white/20 cursor-not-allowed'
                              : currentMedia
                                ? 'bg-white/[0.06] text-white/50 hover:bg-white/10 hover:text-white/70 border border-white/[0.08]'
                                : 'bg-indigo-600 text-white hover:bg-indigo-500'
                          }`}>
                            {isMediaUploading ? 'Uploading...' : currentMedia ? 'Replace card' : 'Upload card'}
                            <input
                              type="file"
                              accept="image/*,video/*"
                              className="hidden"
                              disabled={isMediaUploading || isDetailUploading}
                              onChange={e => {
                                const file = e.target.files?.[0];
                                if (file) handleUpload(ex.id, file, 'card');
                                e.target.value = '';
                              }}
                            />
                          </label>

                          <label className={`cursor-pointer text-center text-xs px-3 py-2 rounded-xl font-bold transition ${
                            isDetailUploading
                              ? 'bg-white/[0.04] text-white/20 cursor-not-allowed'
                              : detailImage
                                ? 'bg-white/[0.06] text-white/50 hover:bg-white/10 hover:text-white/70 border border-white/[0.08]'
                                : 'bg-indigo-600 text-white hover:bg-indigo-500'
                          }`}>
                            {isDetailUploading ? 'Uploading...' : detailImage ? 'Replace detail' : 'Upload detail'}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={isMediaUploading || isDetailUploading}
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
