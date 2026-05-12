import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Scale, User as UserIcon, Lock, Loader2, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { signIn } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await signIn(login, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Erro ao entrar. Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#020617] flex items-center justify-center p-4 overflow-hidden relative selection:bg-indigo-500/30">
      {/* Precision background elements */}
      <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_2px_2px,rgba(255,255,255,0.02)_1px,transparent_0)] bg-[size:32px_32px]"></div>
      <div className="absolute top-1/4 -left-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-1/4 -right-40 w-96 h-96 bg-indigo-600/5 rounded-full blur-[120px] pointer-events-none"></div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm relative z-10"
      >
        <div className="bg-[#0F172A] border border-[#1E293B] rounded-xl p-8 shadow-2xl overflow-hidden group">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-10">
              <img src="/logo.png" alt="Lex.AI Logo" className="h-20 w-auto drop-shadow-[0_0_30px_rgba(99,102,241,0.4)]" />
            </div>
            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
              Private Selection Terminal v3.0
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-rose-500/5 border border-rose-500/20 text-rose-500 p-3 rounded-lg text-[10px] font-bold uppercase tracking-tight"
              >
                ACCESS_DENIED: {error}
              </motion.div>
            )}

            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest ml-1 font-mono">USUARIO_AUTH</label>
              <div className="relative group/field">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-600 group-focus-within/field:text-indigo-400 transition-colors">
                  <UserIcon size={16} />
                </div>
                <input
                  type="text"
                  required
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  className="block w-full pl-10 pr-4 py-2.5 bg-[#020617] border border-[#1E293B] rounded-lg text-xs text-slate-200 placeholder:text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-medium"
                  placeholder="ID_USUARIO"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between px-1">
                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono">TOKEN_PASS</label>
              </div>
              <div className="relative group/field">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-600 group-focus-within/field:text-indigo-400 transition-colors">
                  <Lock size={16} />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-4 py-2.5 bg-[#020617] border border-[#1E293B] rounded-lg text-xs text-slate-200 placeholder:text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-[10px] uppercase tracking-[0.2em] py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-indigo-600/10 mt-6 group border border-indigo-500/20"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <>
                  Validar Credenciais
                  <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-[#1E293B] flex items-center justify-between">
            <p className="text-[#1E293B] hover:text-slate-600 text-[8px] font-bold uppercase tracking-widest cursor-default transition-colors">
              Encrypted Session
            </p>
            <a href="#" className="text-[8px] font-bold text-indigo-500 uppercase tracking-widest hover:text-indigo-400 transition-colors">
              Recovery Mode
            </a>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
