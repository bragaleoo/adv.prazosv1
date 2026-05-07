import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: any | null;
  session: any | null;
  loading: boolean;
  signIn: (login: string, pass: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for fake session in localStorage
    const savedUser = localStorage.getItem('jusprazo_user');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      setSession({ user: parsedUser });
    }
    setLoading(false);
  }, []);

  const signIn = async (login: string, pass: string) => {
    if (login === 'admelqui' && pass === '794613@') {
      const fakeUser = {
        id: 'fake-id-123',
        email: 'admelqui@jusprazo.com',
        user_metadata: { full_name: 'Dr. Melquisedeque' }
      };
      setUser(fakeUser);
      setSession({ user: fakeUser });
      localStorage.setItem('jusprazo_user', JSON.stringify(fakeUser));
    } else if (login === 'alice.melquiadv' && pass === '136479@') {
      const fakeUser = {
        id: 'fake-id-456',
        email: 'alice.melquiadv@jusprazo.com',
        user_metadata: { full_name: 'Alice Melquisedeque' }
      };
      setUser(fakeUser);
      setSession({ user: fakeUser });
      localStorage.setItem('jusprazo_user', JSON.stringify(fakeUser));
    } else {
      throw new Error('Credenciais inválidas. Verifique o login e a senha.');
    }
  };

  const signOut = async () => {
    setUser(null);
    setSession(null);
    localStorage.removeItem('jusprazo_user');
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
