'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CsvUploader() {
  const router   = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [name, setName]     = useState('');
  const [file, setFile]     = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');

  const handleUpload = async () => {
    if (!file || !name) { setError('Please enter a name and select a CSV file'); return; }
    setLoading(true); setError('');
    const fd = new FormData();
    fd.append('file', file);
    fd.append('name', name);

    try {
      const res  = await fetch('/api/programs', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      router.push(`/program/${json.data.id}`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-dashed border-indigo-300 space-y-4">
      <h2 className="text-lg font-semibold text-gray-700">Load New Program</h2>
      <input type="text" placeholder="Program name (e.g. Push Pull Legs)"
        className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm
          focus:outline-none focus:ring-2 focus:ring-indigo-400"
        value={name} onChange={e => setName(e.target.value)} />
      <div
        onClick={() => inputRef.current?.click()}
        className="cursor-pointer border-2 border-dashed border-indigo-200 rounded-xl
          p-8 text-center text-gray-400 hover:border-indigo-400 transition">
        {file ? (
          <p className="text-indigo-600 font-medium">{file.name}</p>
        ) : (
          <p>Click to select a CSV file</p>
        )}
        <input ref={inputRef} type="file" accept=".csv" className="hidden"
          onChange={e => setFile(e.target.files?.[0] ?? null)} />
      </div>
      {error && <p className="text-red-500 text-sm whitespace-pre-wrap">{error}</p>}
      <button onClick={handleUpload} disabled={loading}
        className="w-full bg-indigo-600 text-white rounded-xl py-2 font-medium
          hover:bg-indigo-700 disabled:opacity-50 transition">
        {loading ? 'Uploading…' : 'Upload & Parse Program'}
      </button>
    </div>
  );
}
