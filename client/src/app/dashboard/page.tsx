'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useSocket } from '@/context/SocketContext';
import { Utensils, LogOut, Plus, Users, User, ArrowRight, Clipboard } from 'lucide-react';
import styles from '@/styles/glass.module.scss';

export default function DashboardPage() {
  const router = useRouter();
  const { connectSocket } = useSocket();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [shortCode, setShortCode] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Authenticate user check
  useEffect(() => {
    const token = localStorage.getItem('vacamake_token');
    const user = localStorage.getItem('vacamake_user');

    if (!token || !user) {
      localStorage.removeItem('vacamake_token');
      localStorage.removeItem('vacamake_user');
      router.push('/login');
      return;
    }

    try {
      setCurrentUser(JSON.parse(user));
    } catch {
      router.push('/login');
    }
  }, [router]);

  const handleCreateVaca = async () => {
    setError(null);
    setCreateLoading(true);

    try {
      const session = await apiFetch('/api/sessions/create', {
        method: 'POST',
      });

      // Ensure socket is initialized
      const token = localStorage.getItem('vacamake_token');
      if (token) {
        connectSocket(token);
      }

      router.push(`/session/${session.id}`);
    } catch (err: any) {
      setError(err.message || 'Error al crear la sesión');
      setCreateLoading(false);
    }
  };

  const handleJoinVaca = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shortCode) return;

    setError(null);
    setJoinLoading(true);

    try {
      const data = await apiFetch('/api/sessions/join', {
        method: 'POST',
        body: JSON.stringify({ shortCode }),
      });

      // Ensure socket is initialized
      const token = localStorage.getItem('vacamake_token');
      if (token) {
        connectSocket(token);
      }

      router.push(`/session/${data.session.id}`);
    } catch (err: any) {
      setError(err.message || 'Código de sesión no encontrado o inválido');
    } finally {
      setJoinLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('vacamake_token');
    localStorage.removeItem('vacamake_user');
    router.push('/');
  };

  if (!currentUser) {
    return (
      <div className="flex-1 flex justify-center items-center bg-slate-50">
        <div className="h-10 w-10 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50 text-slate-800">
      
      {/* App Header */}
      <header className="z-10 w-full max-w-lg mx-auto px-6 pt-6 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center shadow-md">
            <Utensils className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight text-slate-900">VacaMake</span>
        </div>
        
        <button 
          onClick={handleLogout}
          className="flex items-center text-xs font-semibold text-slate-600 hover:text-red-500 transition-colors bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm"
        >
          <LogOut className="w-3.5 h-3.5 mr-1.5" />
          Salir
        </button>
      </header>

      {/* Main Container */}
      <main className="flex-1 z-10 w-full max-w-md mx-auto px-4 py-8 flex flex-col justify-center">
        
        {/* User Welcome Card */}
        <div className="mb-6 flex items-center space-x-4 p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500">
            <User className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Hola de nuevo,</p>
            <h2 className="text-base font-bold text-slate-950">@{currentUser.username}</h2>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Dashboard Actions */}
        <div className="space-y-5">
          {/* Create Vaca */}
          <div className={`${styles.panelGlow} rounded-3xl p-6 relative overflow-hidden group`}>
            <div className="absolute top-0 right-0 p-6 opacity-5">
              <Plus className="w-24 h-24 text-orange-500" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Comienza una nueva mesa</h3>
            <p className="text-sm text-slate-500 mb-6">
              Crea una cuenta en tiempo real y comparte el código con tus amigos para empezar a dividir platos.
            </p>
            <button
              onClick={handleCreateVaca}
              disabled={createLoading}
              className="w-full flex items-center justify-center bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl py-3.5 px-4 transition-colors disabled:opacity-50 group shadow-md text-sm"
            >
              {createLoading ? (
                <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Hacer una Vaca
                </>
              )}
            </button>
          </div>

          {/* Join Vaca */}
          <div className={`${styles.panel} rounded-3xl p-6`}>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Únete a una mesa</h3>
            <p className="text-sm text-slate-500 mb-6">
              Ingresa el código de 6 letras/números que te compartió el creador de la mesa.
            </p>

            <form onSubmit={handleJoinVaca} className="space-y-4">
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Clipboard className="h-5 w-5" />
                </span>
                <input
                  type="text"
                  maxLength={6}
                  required
                  placeholder="Código (ej. AB12CD)"
                  value={shortCode}
                  onChange={(e) => setShortCode(e.target.value.toUpperCase())}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-orange-500 focus:bg-white tracking-widest font-mono text-center font-bold transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={joinLoading || shortCode.length < 6}
                className="w-full flex items-center justify-center bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-xl py-3.5 px-4 transition-all disabled:opacity-40 group text-sm border border-slate-200 shadow-sm"
              >
                {joinLoading ? (
                  <div className="h-5 w-5 border-2 border-slate-700 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Users className="w-4 h-4 mr-2" />
                    Unirse a la Mesa
                    <ArrowRight className="ml-auto w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* Footer copyright */}
      <footer className="py-6 text-center text-xs text-slate-400">
        <p>FER Dev Solutions LLC</p>
      </footer>
    </div>
  );
}
