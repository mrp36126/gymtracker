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
    <main className="min-h-screen bg-[#0A0A0F] flex items-center justify-center p-6">
      <div className="w-full max-w-sm">

        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-6">
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-500"></div>
            <span className="font-bold text-white tracking-tight">GymTracker Pro</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Create account</h1>
          <p className="text-white/40 text-sm mt-2">Start tracking your progress today</p>
        </div>

        <div className="space-y-3 mb-4">
          <div>
            <label className="block text-xs font-semibold text-white/40 uppercase tracking-widest mb-2">Your name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Pierre"
              className="w-full bg-white/[0.06] border border-white/[0.08] rounded-xl px-4 py-3.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.08] transition"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-white/40 uppercase tracking-widest mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-white/[0.06] border border-white/[0.08] rounded-xl px-4 py-3.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.08] transition"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-white/40 uppercase tracking-widest mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Min. 8 characters"
              className="w-full bg-white/[0.06] border border-white/[0.08] rounded-xl px-4 py-3.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.08] transition"
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <button
          onClick={handleRegister}
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-3.5 font-bold text-sm tracking-wide transition disabled:opacity-50 mb-6">
          {loading ? 'Creating account...' : 'Create Account'}
        </button>

        <p className="text-center text-sm text-white/30">
          Already have an account?{' '}
          <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-semibold transition">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
