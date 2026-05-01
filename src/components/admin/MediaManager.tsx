'use client';
import { useState } from 'react';

interface Exercise {
  id: string;
  name: string;
  day: string;
  muscleGroup: string;
  mediaUrl: string | null;
}

interface Program {
  id: string;
  name: string;
  exercises: Exercise[];
}

interface Props {
  programs: Program[];
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
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleUpload = async (exerciseId: string, file: File) => {
    setUploading(exerciseId);
    setError('');
    setSuccess('');

    const fd = new FormData();
    fd.append('file', file);
    fd.append('exerciseId', exerciseId);

    try {
      const res = await fetch('/api/admin/media', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setMediaMap(prev => ({ ...prev, [exerciseId]: json.data.mediaUrl }));
      setSuccess(`Media uploaded for exercise!`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUploading(null);
    }
  };

  const dayOrder = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-600 text-sm">{error}</div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-green-600 text-sm">✅ {success}</div>
      )}

      {programs.map(program => {
        const byDay = program.exercises.reduce((acc, ex) => {
          if (!acc[ex.day]) acc[ex.day] = [];
          acc[ex.day].push(ex);
          return acc;
        }, {} as Record<string, Exercise[]>);

        return (
          <div key={program.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-indigo-600 px-5 py-3">
              <h2 className="text-white font-bold">{program.name}</h2>
            </div>

            <div className="divide-y divide-gray-50">
              {dayOrder.filter(d => byDay[d]).map(day => (
                <div key={day}>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-5 py-2 bg-gray-50">
                    {day}
                  </p>
                  {byDay[day].map(ex => {
                    const currentMedia = mediaMap[ex.id];
                    const isVideo = currentMedia?.endsWith('.mp4') || currentMedia?.endsWith('.mov');
                    const isUploading = uploading === ex.id;

                    return (
                      <div key={ex.id} className="flex items-center gap-4 px-5 py-4">
                        {/* Preview thumbnail */}
                        <div className="w-20 h-14 bg-indigo-50 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center">
                          {currentMedia ? (
                            isVideo ? (
                              <video src={currentMedia} className="w-full h-full object-cover" muted />
                            ) : (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={currentMedia} alt={ex.name} className="w-full h-full object-cover" />
                            )
                          ) : (
                            <span className="text-2xl">📷</span>
                          )}
                        </div>

                        {/* Exercise info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-800 text-sm">{ex.name}</p>
                          <p className="text-xs text-gray-400">{ex.muscleGroup}</p>
                          {currentMedia && (
                            <p className="text-xs text-green-600 mt-0.5 truncate">✅ Media linked</p>
                          )}
                        </div>

                        {/* Upload button */}
                        <label className={`cursor-pointer flex-shrink-0 text-xs px-3 py-2 rounded-lg font-medium transition
                          ${isUploading
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : currentMedia
                              ? 'bg-gray-100 text-gray-600 hover:bg-indigo-50 hover:text-indigo-600'
                              : 'bg-indigo-600 text-white hover:bg-indigo-700'
                          }`}>
                          {isUploading ? 'Uploading…' : currentMedia ? 'Replace' : 'Upload'}
                          <input
                            type="file"
                            accept="image/*,video/*"
                            className="hidden"
                            disabled={isUploading}
                            onChange={e => {
                              const file = e.target.files?.[0];
                              if (file) handleUpload(ex.id, file);
                              e.target.value = '';
                            }}
                          />
                        </label>
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
