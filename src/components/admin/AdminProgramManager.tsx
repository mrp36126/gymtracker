'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface Program {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
  _count: { exercises: number };
}

interface Props { programs: Program[]; }

export default function AdminProgramManager({ programs: initial }: Props) {
  const router = useRouter();
  const [programs, setPrograms] = useState(initial);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [activating, setActivating] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const showSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleUpload = async () => {
    if (!selectedFile || !newName.trim()) {
      setError('Please enter a program name and select a CSV file');
      return;
    }
    setUploading(true);
    setError('');
    const fd = new FormData();
    fd.append('file', selectedFile);
    fd.append('name', newName.trim());
    try {
      const res = await fetch('/api/programs', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      showSuccess(`Program "${newName}" uploaded successfully!`);
      setNewName('');
      setSelectedFile(null);
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  };

  const handleRename = async (id: string) => {
    if (!editName.trim()) return;
    setError('');
    try {
      const res = await fetch(`/api/programs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setPrograms(prev => prev.map(p => p.id === id ? { ...p, name: editName.trim() } : p));
      setEditingId(null);
      showSuccess('Program renamed!');
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleActivate = async (id: string) => {
    setActivating(id);
    setError('');
    try {
      const res = await fetch(`/api/programs/${id}/activate`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to activate');
      setPrograms(prev => prev.map(p => ({ ...p, isActive: p.id === id })));
      showSuccess('Program activated — all users will now see this program!');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setActivating(null);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setDeleting(id);
    setError('');
    try {
      const res = await fetch(`/api/programs/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      setPrograms(prev => prev.filter(p => p.id !== id));
      showSuccess(`"${name}" deleted.`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-6">

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-600 text-sm whitespace-pre-wrap">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-green-700 text-sm">
          {success}
        </div>
      )}

      {/* Upload new program */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="bg-indigo-600 px-5 py-3">
          <h2 className="text-white font-bold">Upload New Program</h2>
        </div>
        <div className="p-5 space-y-3">
          <input
            type="text"
            placeholder="Program name (e.g. Push Pull Legs)"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm
              focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <div
            onClick={() => fileRef.current?.click()}
            className="cursor-pointer border-2 border-dashed border-indigo-200 rounded-xl
              p-6 text-center text-gray-400 hover:border-indigo-400 transition">
            {selectedFile ? (
              <p className="text-indigo-600 font-medium">{selectedFile.name}</p>
            ) : (
              <p className="text-sm">Click to select a CSV file</p>
            )}
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={e => setSelectedFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="w-full bg-indigo-600 text-white rounded-xl py-2.5 font-medium
              hover:bg-indigo-700 disabled:opacity-50 transition">
            {uploading ? 'Uploading & parsing...' : 'Upload Program'}
          </button>
        </div>
      </div>

      {/* Existing programs */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="bg-indigo-600 px-5 py-3 flex items-center justify-between">
          <h2 className="text-white font-bold">Existing Programs</h2>
          <span className="text-indigo-200 text-sm">
            {programs.length} program{programs.length !== 1 ? 's' : ''}
          </span>
        </div>

        {programs.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <p>No programs yet. Upload your first CSV above.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {programs.map(program => (
              <div key={program.id} className="p-5">

                {/* Name row */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    {editingId === program.id ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleRename(program.id)}
                          className="flex-1 border border-indigo-300 rounded-lg px-3 py-1.5 text-sm
                            focus:outline-none focus:ring-2 focus:ring-indigo-400"
                          autoFocus
                        />
                        <button
                          onClick={() => handleRename(program.id)}
                          className="bg-indigo-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition">
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="bg-gray-100 text-gray-600 text-xs px-3 py-1.5 rounded-lg hover:bg-gray-200 transition">
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-gray-800">{program.name}</p>
                        {program.isActive && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                            Active
                          </span>
                        )}
                      </div>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {program._count.exercises} exercises · Added {new Date(program.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2">
                  {!program.isActive && (
                    <button
                      onClick={() => handleActivate(program.id)}
                      disabled={activating === program.id}
                      className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg
                        hover:bg-green-700 disabled:opacity-50 transition">
                      {activating === program.id ? 'Activating...' : 'Set Active'}
                    </button>
                  )}

                  <button
                    onClick={() => { setEditingId(program.id); setEditName(program.name); }}
                    className="text-xs bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg
                      hover:bg-indigo-100 transition">
                    Rename
                  </button>

                  
                    href={`/program/${program.id}`}
                    className="text-xs bg-gray-50 text-gray-600 px-3 py-1.5 rounded-lg
                      hover:bg-gray-100 transition">
                    View Exercises
                  </a>

                  
                    href="/admin/media"
                    className="text-xs bg-gray-50 text-gray-600 px-3 py-1.5 rounded-lg
                      hover:bg-gray-100 transition">
                    Manage Media
                  </a>

                  {!program.isActive && (
                    <button
                      onClick={() => handleDelete(program.id, program.name)}
                      disabled={deleting === program.id}
                      className="text-xs bg-red-50 text-red-600 px-3 py-1.5 rounded-lg
                        hover:bg-red-100 disabled:opacity-50 transition ml-auto">
                      {deleting === program.id ? 'Deleting...' : 'Delete'}
                    </button>
                  )}
                </div>

                {program.isActive && (
                  <p className="text-xs text-gray-300 mt-2">
                    Active programs cannot be deleted. Set another program active first.
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
