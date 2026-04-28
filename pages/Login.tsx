import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

export const Login: React.FC = () => {
  const { signIn, signUpCustomer, authLoading, authError } = useApp();
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [regName, setRegName] = useState('');
  const [regTitle, setRegTitle] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const handleLogin = () => {
    void signIn(email, password);
  };

  const handleRegister = () => {
    if (!regName.trim() || !regEmail.trim() || !regPassword.trim()) return alert('Fill all required fields');
    void signUpCustomer({ name: regName.trim(), email: regEmail.trim(), password: regPassword, title: regTitle.trim() || 'Customer' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4 py-12 relative overflow-hidden">
      <div className="absolute inset-0 opacity-40">
        <div className="absolute top-[-10%] left-[-10%] w-72 h-72 bg-brand-500/40 blur-3xl rounded-full" />
        <div className="absolute bottom-[-10%] right-[-5%] w-80 h-80 bg-indigo-500/40 blur-3xl rounded-full" />
      </div>

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-xl shadow-2xl shadow-black/30 relative z-10 overflow-hidden">
        <div className="hidden lg:flex flex-col justify-between p-10 text-white bg-gradient-to-br from-brand-600 via-indigo-600 to-slate-900">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-white/70">LogisticsCore</span>
            <h1 className="text-3xl font-bold mt-4">Fleet, Workforce, and Customer Ops in one console.</h1>
            <p className="text-white/80 mt-3">Login with your role or register as a customer.</p>
          </div>
        </div>

        <div className="p-10 bg-white">
          <div className="flex justify-between items-center mb-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Access</p>
              <h2 className="text-2xl font-bold text-slate-900 mt-2">{mode === 'LOGIN' ? 'Login' : 'Register as Customer'}</h2>
              <p className="text-sm text-slate-500">{mode === 'LOGIN' ? 'Sign in with your email and password.' : 'Create a customer account to view your planning.'}</p>
            </div>
            <button
              onClick={() => setMode(mode === 'LOGIN' ? 'REGISTER' : 'LOGIN')}
              className="text-sm font-bold text-brand-600 hover:text-brand-500"
            >
              {mode === 'LOGIN' ? 'Register' : 'Back to Login'}
            </button>
          </div>

          {mode === 'LOGIN' ? (
            <div className="space-y-4">
              <input
                className="w-full bg-white border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-brand-500 outline-none text-sm font-medium"
                placeholder="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
              <input
                type="password"
                className="w-full bg-white border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-brand-500 outline-none text-sm font-medium"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              <button
                onClick={handleLogin}
                className="w-full bg-brand-600 hover:bg-brand-500 text-white px-4 py-3 rounded-xl font-bold shadow-lg shadow-brand-500/20 transition-all active:scale-[0.98] disabled:opacity-60"
                disabled={authLoading}
              >
                {authLoading ? 'Signing in...' : 'Login'}
              </button>
              {authError && <p className="text-xs text-red-600 text-center">{authError}</p>}
            </div>
          ) : (
            <div className="space-y-3">
              <input
                className="w-full bg-white border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-brand-500 outline-none text-sm font-medium"
                placeholder="Customer name / company"
                value={regName}
                onChange={e => setRegName(e.target.value)}
              />
              <input
                className="w-full bg-white border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-brand-500 outline-none text-sm font-medium"
                placeholder="Title (optional)"
                value={regTitle}
                onChange={e => setRegTitle(e.target.value)}
              />
              <input
                className="w-full bg-white border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-brand-500 outline-none text-sm font-medium"
                placeholder="Email"
                value={regEmail}
                onChange={e => setRegEmail(e.target.value)}
              />
              <input
                type="password"
                className="w-full bg-white border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-brand-500 outline-none text-sm font-medium"
                placeholder="Password"
                value={regPassword}
                onChange={e => setRegPassword(e.target.value)}
              />
              <button
                onClick={handleRegister}
                className="w-full bg-brand-600 hover:bg-brand-500 text-white px-4 py-3 rounded-xl font-bold shadow-lg shadow-brand-500/20 transition-all active:scale-[0.98] disabled:opacity-60"
                disabled={authLoading}
              >
                {authLoading ? 'Registering...' : 'Register & Login'}
              </button>
              {authError && <p className="text-xs text-red-600">{authError}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
