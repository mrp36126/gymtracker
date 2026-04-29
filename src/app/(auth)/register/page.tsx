'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleRegister = async () => {
  setError(''); setLoading(true);
  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    const json = await res.json();
    if (!res.ok) {
      // Handle Zod array errors or plain string errors
      const msg = Array.isArray(json.error)
        ? json.error.map((e: any) => e.message).join(', ')
        : json.error ?? 'Registration failed';
      throw new Error(msg);
    }

    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signInWithPassword({ email, password });
    router.push('/welcome');
    router.refresh();
  } catch (e: any) {
    setError(e.message);
    setLoading(false);
  }
};

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-indigo-700 mb-1">Create account</h1>
        <p className="text-gray-400 text-sm mb-6">Start tracking your gym progress</p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Your name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Peter"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm
                focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm
                focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Min. 8 characters"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm
                focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button onClick={handleRegister} disabled={loading}
            className="w-full bg-indigo-600 text-white rounded-xl py-2.5 font-medium
              hover:bg-indigo-700 disabled:opacity-50 transition">
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </div>

        <p className="text-center text-sm text-gray-400 mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-indigo-600 font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
