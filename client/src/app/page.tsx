'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Utensils, ArrowRight, Users, Zap, ShieldCheck } from 'lucide-react';
import styles from '@/styles/glass.module.scss';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('vacamake_token');
    if (token) {
      router.push('/dashboard');
    }
  }, [router]);

  return (
    <div className="flex-1 flex flex-col bg-slate-50 text-slate-800">
      {/* Header */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between border-b border-slate-200/60">
        <div className="flex items-center space-x-2">
          <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center shadow-md">
            <Utensils className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900">VacaMake</span>
        </div>
        <div className="flex items-center space-x-4">
          <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
            Iniciar sesión
          </Link>
          <Link 
            href="/register" 
            className="text-sm font-medium bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl transition-colors shadow-md"
          >
            Registrarse
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col justify-center max-w-4xl mx-auto px-6 text-center py-12 md:py-20">
        <span className="inline-flex items-center space-x-2 bg-orange-100 border border-orange-200 rounded-full px-4 py-1.5 text-xs text-orange-700 font-semibold tracking-wide uppercase mb-6 self-center">
          <span>🍴 Cuentas claras conservan amistades</span>
        </span>

        <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight text-slate-900 mb-6">
          Divide la cuenta del restaurante{' '}
          <span className="text-orange-500">
            fácil y sin dramas
          </span>
        </h1>

        <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-10">
          VacaMake te ayuda a unirte con tus amigos en tiempo real, agregar los platos de la mesa, marcar quién consumió qué y calcular el total de cada uno en segundos.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <Link 
            href="/register" 
            className="w-full sm:w-auto flex items-center justify-center bg-orange-500 hover:bg-orange-600 text-white font-bold px-8 py-4 rounded-2xl transition-all shadow-lg shadow-orange-500/10 group text-base"
          >
            Comenzar VacaMake
            <ArrowRight className="ml-2 w-5 h-5 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link 
            href="/login" 
            className="w-full sm:w-auto flex items-center justify-center bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold px-8 py-4 rounded-2xl transition-all shadow-sm"
          >
            Tengo un código de mesa
          </Link>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto text-left">
          <div className={`${styles.panel} rounded-2xl p-6`}>
            <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center text-orange-500 mb-4">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Sincronización en Vivo</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Mira en vivo quién agrega qué plato y quién reclama su parte. La pantalla se actualiza instantáneamente con WebSockets.
            </p>
          </div>

          <div className={`${styles.panel} rounded-2xl p-6`}>
            <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center text-orange-500 mb-4">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Porciones Ajustadas</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              ¿Alguien pidió un plato para compartir o el doble? Ajusta los pesos de división por plato de forma flexible sin peleas matemáticas.
            </p>
          </div>

          <div className={`${styles.panel} rounded-2xl p-6`}>
            <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center text-orange-500 mb-4">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Precisión Matemática</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Cero errores de centavos. Cálculos matemáticos rigurosos y soporte de conversión de divisas local (Bs) ingresando tasas manuales.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <p>© {new Date().getFullYear()} VacaMake es propiedad de FER Dev Solutions LLC. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}
