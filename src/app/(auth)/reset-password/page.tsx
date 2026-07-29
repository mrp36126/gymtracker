'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasRecoveryParams, setHasRecoveryParams] = useState(false);
  const [checkingRecovery, setCheckingRecovery] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') {
      setCheckingRecovery(false);
      return;
    }

    const currentUrl = new URL(window.location.href);
    const searchParams = currentUrl.searchParams;
    const hasSearchRecovery = searchParams.get('type') === 'recovery'
      || Boolean(searchParams.get('access_token'))
      || Boolean(searchParams.get('refresh_token'));
    const hash = window.location.hash;
    const hasHashRecovery = hash.includes('type=recovery')
      || hash.includes('access_token=')
      || hash.includes('refresh_token=');

    const recoveryPresent = hasSearchRecovery || hasHashRecovery;
    setHasRecoveryParams(recoveryPresent);

    const supabase = createSupabaseBrowserClient();
    supabase.auth.getSession()
      .then(({ data, error }) => {
        if (error) {
          console.error('Supabase session check failed:', error);
          return;
        }

        if (!data.session && !recoveryPresent) {
          setError('This reset link appears invalid or expired. Please request a new password reset email.');
        }
      })
      .finally(() => setCheckingRecovery(false));
  }, []);

  const handleReset = async () => {
    setError('');
    setStatus('');

    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        throw new Error(error.message);
      }

      setStatus('Your password has been updated. Please sign in with your new password.');
      setPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.message || 'Unable to update password.');
    } finally {
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
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Reset password</h1>
          <p className="text-white/40 text-sm mt-2">Choose a new password to complete reset.</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {status && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 mb-4">
            <p className="text-emerald-400 text-sm">{status}</p>
          </div>
        )}

        <div className="space-y-3 mb-4">
          <div>
            <label className="block text-xs font-semibold text-white/40 uppercase tracking-widest mb-2">New password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-white/[0.06] border border-white/[0.08] rounded-xl px-4 py-3.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.08] transition"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-white/40 uppercase tracking-widest mb-2">Confirm password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-white/[0.06] border border-white/[0.08] rounded-xl px-4 py-3.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.08] transition"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={handleReset}
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-3.5 font-bold text-sm tracking-wide transition disabled:opacity-50 mb-6"
        >
          {loading ? 'Resetting...' : 'Reset password'}
        </button>

        <p className="text-center text-sm text-white/30">
          <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-semibold transition">
            Back to sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
