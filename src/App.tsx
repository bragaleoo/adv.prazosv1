import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Prazos from './pages/Prazos';
import Semana from './pages/Semana';
import Processos from './pages/Processos';
import Andamentos from './pages/Andamentos';
import Kanban from './pages/Kanban';
import Publicacoes from './pages/Publicacoes';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-full bg-[#020617] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
          <p className="text-slate-500 font-bold animate-pulse uppercase tracking-[0.2em] text-[10px]">LEX.AI SECURE SESSION</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/prazos" element={<PrivateRoute><Prazos /></PrivateRoute>} />
          <Route path="/semana" element={<PrivateRoute><Semana /></PrivateRoute>} />

          {/* Novas rotas — Fase 1 */}
          <Route path="/processos" element={<PrivateRoute><Processos /></PrivateRoute>} />
          <Route path="/andamentos" element={<PrivateRoute><Andamentos /></PrivateRoute>} />
          <Route path="/kanban" element={<PrivateRoute><Kanban /></PrivateRoute>} />
          <Route path="/publicacoes" element={<PrivateRoute><Publicacoes /></PrivateRoute>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
