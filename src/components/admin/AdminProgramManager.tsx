'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Program {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
  description?: string | null;
  programType: string;
  _count: { exercises: number };
}

interface AssignableUser {
  id: string;
  name: string;
  email: string;
}

interface Props {
  programs: Program[];
  users: AssignableUser[];
}

export default function AdminProgramManager({ programs: initial, users }: Props) {
  const router = useRouter();
  const [programs, setPrograms] = useState(initial);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [activating, setActivating] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<Record<string, string>>({});
  const [editName, setEditName] = useState('');
  const [newName, setNewName] = useState('');
  const [description, setDescription] = useState('');
  const [programType, setProgramType] = useState<'primary' | 'supplementary'>('primary');
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
    fd.append('programType', programType);
    fd.append('description', description.trim());
    try {
      const res = await fetch('/api/programs', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      showSuccess('Program "' + newName + '" uploaded successfully!');
      setNewName('');
      setDescription('');
      setSelectedFile(null);
      setProgramType('primary');
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
      const res = await fetch('/api/programs/' + id, {
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
      const res = await fetch('/api/programs/' + id + '/activate', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to activate');
      const activatedType = programs.find(p => p.id === id)?.programType;
      setPrograms(prev => prev.map(p =>
        p.programType === activatedType
          ? { ...p, isActive: p.id === id }
          : p
      ));
      showSuccess('Program activated!');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setActivating(null);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm('Delete "' + name + '"? This cannot be undone.')) return;
    setDeleting(id);
    setError('');
    try {
      const res = await fetch('/api/programs/' + id, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      setPrograms(prev => prev.filter(p => p.id !== id));
      showSuccess('"' + name + '" deleted.');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setDeleting(null);
    }
  };

  const handleAssign = async (program: Program) => {
    const targetUserId = selectedUsers[program.id];
    if (!targetUserId) {
      setError('Please choose a user before assigning this program');
      return;
    }

    setAssigning(program.id);
    setError('');
    try {
      const res = await fetch('/api/admin/program-assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceProgramId: program.id,
          targetUserId,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      const assignedUser = users.find(user => user.id === targetUserId);
      showSuccess(
        '"' + program.name + '" assigned to ' +
        (assignedUser ? `${assignedUser.name} (${assignedUser.email})` : 'selected user') +
        ' and set active.'
      );
    } catch (e: any) {
      setError(e.message);
    } finally {
      setAssigning(null);
    }
  };

  const primaryPrograms = programs.filter(p => p.programType === 'primary');
  const supplementaryPrograms = programs.filter(p => p.programType === 'supplementary');

  return (
    <div className="space-y-6">

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-sm whitespace-pre-wrap">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-emerald-400 text-sm">
          {success}
        </div>
      )}

      {/* Upload new program */}
      <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="bg-indigo-600/20 border-b border-indigo-500/20 px-5 py-3">
          <h2 className="text-white font-bold text-sm">Upload New Program</h2>
        </div>
        <div className="p-5 space-y-3">

          <input
            type="text"
            placeholder="Program name (e.g. Push Pull Legs)"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            className="w-full bg-white/[0.06] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-500/50 transition"
          />

          <input
            type="text"
            placeholder="Description (optional) e.g. Afternoon conditioning"
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="w-full bg-white/[0.06] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-500/50 transition"
          />

          <div className="grid grid-cols-2 gap-3">
            <label className={'flex-1 cursor-pointer rounded-xl border-2 p-3 text-center text-sm font-medium transition ' + (programType === 'primary' ? 'border-indigo-600 bg-indigo-500/10 text-indigo-400' : 'border-gray-200 text-gray-400 hover:border-gray-300')}>
              <input
                type="radio"
                name="programType"
                value="primary"
                checked={programType === 'primary'}
                onChange={() => setProgramType('primary')}
                className="hidden"
              />
              Primary Program
              <p className="text-xs font-normal mt-0.5 opacity-70">Daily workout, day-based</p>
            </label>
            <label className={'flex-1 cursor-pointer rounded-xl border-2 p-3 text-center text-sm font-medium transition ' + (programType === 'supplementary' ? 'border-indigo-600 bg-indigo-500/10 text-indigo-400' : 'border-gray-200 text-gray-400 hover:border-gray-300')}>
              <input
                type="radio"
                name="programType"
                value="supplementary"
                checked={programType === 'supplementary'}
                onChange={() => setProgramType('supplementary')}
                className="hidden"
              />
              Supplementary
              <p className="text-xs font-normal mt-0.5 opacity-70">Extra program e.g. Hyrox</p>
            </label>
          </div>

          <div
            onClick={() => fileRef.current?.click()}
            className="cursor-pointer border border-dashed border-white/[0.1] rounded-xl p-6 text-center text-white/30 hover:border-indigo-500/40 transition">
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
            className="w-full bg-indigo-600 text-white rounded-xl py-2.5 font-medium hover:bg-indigo-700 disabled:opacity-50 transition">
            {uploading ? 'Uploading & parsing...' : 'Upload Program'}
          </button>
        </div>
      </div>

      {/* Primary Programs */}
      <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="bg-indigo-600/20 border-b border-indigo-500/20 px-5 py-3 flex items-center justify-between">
          <h2 className="text-white font-bold text-sm">Primary Programs</h2>
          <span className="text-indigo-300/60 text-xs">{primaryPrograms.length} program{primaryPrograms.length !== 1 ? 's' : ''}</span>
        </div>

        {primaryPrograms.length === 0 ? (
          <div className="p-8 text-center text-white/30">
            <p>No primary programs yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {primaryPrograms.map(program => (
              <ProgramRow
                key={program.id}
                program={program}
                editingId={editingId}
                editName={editName}
                activating={activating}
                deleting={deleting}
                setEditingId={setEditingId}
                setEditName={setEditName}
                onRename={handleRename}
                onActivate={handleActivate}
                onDelete={handleDelete}
                users={users}
                selectedUserId={selectedUsers[program.id] ?? ''}
                assigning={assigning}
                onSelectUser={(userId) => setSelectedUsers(prev => ({ ...prev, [program.id]: userId }))}
                onAssign={handleAssign}
              />
            ))}
          </div>
        )}
      </div>

      {/* Supplementary Programs */}
      <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="bg-purple-600/20 border-b border-purple-500/20 px-5 py-3 flex items-center justify-between">
          <h2 className="text-white font-bold text-sm">Supplementary Programs</h2>
          <span className="text-purple-300/60 text-xs">{supplementaryPrograms.length} program{supplementaryPrograms.length !== 1 ? 's' : ''}</span>
        </div>

        {supplementaryPrograms.length === 0 ? (
          <div className="p-8 text-center text-white/30">
            <p>No supplementary programs yet. Upload a Hyrox or conditioning program above.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {supplementaryPrograms.map(program => (
              <ProgramRow
                key={program.id}
                program={program}
                editingId={editingId}
                editName={editName}
                activating={activating}
                deleting={deleting}
                setEditingId={setEditingId}
                setEditName={setEditName}
                onRename={handleRename}
                onActivate={handleActivate}
                onDelete={handleDelete}
                users={users}
                selectedUserId={selectedUsers[program.id] ?? ''}
                assigning={assigning}
                onSelectUser={(userId) => setSelectedUsers(prev => ({ ...prev, [program.id]: userId }))}
                onAssign={handleAssign}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Extracted row component to keep things clean
interface RowProps {
  program: Program;
  editingId: string | null;
  editName: string;
  activating: string | null;
  deleting: string | null;
  setEditingId: (id: string | null) => void;
  setEditName: (name: string) => void;
  onRename: (id: string) => void;
  onActivate: (id: string) => void;
  onDelete: (id: string, name: string) => void;
  users: AssignableUser[];
  selectedUserId: string;
  assigning: string | null;
  onSelectUser: (userId: string) => void;
  onAssign: (program: Program) => void;
}

function ProgramRow({
  program, editingId, editName, activating, deleting,
  setEditingId, setEditName, onRename, onActivate, onDelete,
  users, selectedUserId, assigning, onSelectUser, onAssign,
}: RowProps) {
  return (
    <div className="p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          {editingId === program.id ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && onRename(program.id)}
                className="flex-1 bg-white/[0.06] border border-indigo-500/40 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition"
                autoFocus
              />
              <button
                onClick={() => onRename(program.id)}
                className="bg-indigo-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition">
                Save
              </button>
              <button
                onClick={() => setEditingId(null)}
                className="bg-white/[0.06] text-white/40 text-xs px-3 py-1.5 rounded-lg hover:bg-gray-200 transition">
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-white">{program.name}</p>
              {program.isActive && (
                <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium">
                  Active
                </span>
              )}
            </div>
          )}
          {program.description && (
            <p className="text-xs text-white/40 mt-0.5">{program.description}</p>
          )}
          <p className="text-xs text-gray-300 mt-1">
            {program._count.exercises} exercises · Added {new Date(program.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {!program.isActive && (
          <button
            onClick={() => onActivate(program.id)}
            disabled={activating === program.id}
            className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 disabled:opacity-50 transition">
            {activating === program.id ? 'Activating...' : 'Set Active'}
          </button>
        )}

        <button
          onClick={() => { setEditingId(program.id); setEditName(program.name); }}
          className="text-xs bg-indigo-500/10 text-indigo-400 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition">
          Rename
        </button>

        <Link
          href={'/program/' + program.id}
          className="text-xs bg-white/[0.04] text-white/50 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition">
          View Exercises
        </Link>

        <Link
          href="/admin/media"
          className="text-xs bg-white/[0.04] text-white/50 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition">
          Manage Media
        </Link>

        {!program.isActive && (
          <button
            onClick={() => onDelete(program.id, program.name)}
            disabled={deleting === program.id}
            className="text-xs bg-red-500/10 text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-100 disabled:opacity-50 transition ml-auto">
            {deleting === program.id ? 'Deleting...' : 'Delete'}
          </button>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-white/[0.05]">
        <p className="text-[10px] font-semibold tracking-widest text-white/25 uppercase mb-2">
          Assign to user
        </p>
        {users.length === 0 ? (
          <p className="text-xs text-white/30">No other users available yet.</p>
        ) : (
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              value={selectedUserId}
              onChange={e => onSelectUser(e.target.value)}
              className="flex-1 bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition"
            >
              <option value="">Choose a user</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.email})
                </option>
              ))}
            </select>
            <button
              onClick={() => onAssign(program)}
              disabled={!selectedUserId || assigning === program.id}
              className="text-xs bg-purple-600 text-white px-3 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition"
            >
              {assigning === program.id ? 'Assigning...' : 'Assign Program'}
            </button>
          </div>
        )}
      </div>

      {program.isActive && (
        <p className="text-[10px] text-white/20 mt-2">
          Active programs cannot be deleted. Set another program active first.
        </p>
      )}
    </div>
  );
}
