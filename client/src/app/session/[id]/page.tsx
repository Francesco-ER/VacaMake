'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSocket, Item, Participant, PaymentMethod } from '@/context/SocketContext';
import Decimal from 'decimal.js';
import { 
  Utensils, ArrowLeft, Users, Plus, Trash2, Check, 
  Settings, Sparkles, Copy 
} from 'lucide-react';
import styles from '@/styles/glass.module.scss';

interface CalculationResults {
  participantSubtotals: { [key: string]: Decimal };
  participantTaxes: { [key: string]: Decimal };
  participantTips: { [key: string]: Decimal };
  participantTotals: { [key: string]: Decimal };
  subtotalSumCents: number;
  grandTotalCents: number;
}

export default function SessionPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;

  const {
    isConnected,
    session,
    currentParticipant,
    currentUser,
    error,
    joinSessionRoom,
    addItem,
    deleteItem,
    toggleClaim,
    updateSplitWeight,
    updateSessionSettings,
    updateExchangeRate,
    updatePaymentMethod,
    updateStatus,
    updateSessionStatus
  } = useSocket();

  // Navigation / Tabs state for mobile view
  const [activeTab, setActiveTab] = useState<'items' | 'participants' | 'summary'>('items');

  // Input states
  const [itemDesc, setItemDesc] = useState('');
  const [itemCost, setItemCost] = useState('');
  
  // Settings edit modal / form states
  const [showSettings, setShowSettings] = useState(false);
  const [taxPercent, setTaxPercent] = useState('0');
  const [tipPercent, setTipPercent] = useState('10');
  const [customRate, setCustomRate] = useState('');
  
  const [copiedCode, setCopiedCode] = useState(false);

  // Authenticate check
  useEffect(() => {
    const token = localStorage.getItem('vacamake_token');
    if (!token) {
      router.push('/login');
    }
  }, [router]);

  // Join socket room once connected
  useEffect(() => {
    if (isConnected && sessionId) {
      joinSessionRoom(sessionId);
    }
  }, [isConnected, sessionId, joinSessionRoom]);

  // Pre-populate settings inputs when session loads
  useEffect(() => {
    if (session) {
      const taxUsd = new Decimal(session.globalTax).div(100).toString();
      const tipUsd = new Decimal(session.globalTip).div(100).toString();
      setTaxPercent(taxUsd);
      setTipPercent(tipUsd);
    }
  }, [session]);

  // Pre-populate user's exchange rate
  useEffect(() => {
    if (currentParticipant?.exchangeRate) {
      setCustomRate(currentParticipant.exchangeRate.toString());
    }
  }, [currentParticipant]);

  // Copy code helper
  const handleCopyCode = () => {
    if (session?.shortCode) {
      navigator.clipboard.writeText(session.shortCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  // Add item handler
  const handleAddItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemDesc || !itemCost) return;

    try {
      const cents = new Decimal(itemCost).mul(100).toDecimalPlaces(0).toNumber();
      addItem(itemDesc, cents);
      setItemDesc('');
      setItemCost('');
    } catch {
      alert('Monto inválido');
    }
  };

  // Update session global settings handler
  const handleSaveSettings = () => {
    try {
      const taxCents = new Decimal(taxPercent || '0').mul(100).toDecimalPlaces(0).toNumber();
      const tipCents = new Decimal(tipPercent || '0').mul(100).toDecimalPlaces(0).toNumber();
      updateSessionSettings(taxCents, tipCents);
      setShowSettings(false);
    } catch {
      alert('Valores de impuesto o propina incorrectos');
    }
  };

  // Update custom rate handler
  const handleSaveRate = () => {
    if (!customRate) {
      updateExchangeRate(null);
    } else {
      try {
        const rateFloat = parseFloat(customRate);
        if (rateFloat <= 0 || isNaN(rateFloat)) throw new Error();
        updateExchangeRate(rateFloat);
      } catch {
        alert('Tasa de cambio inválida');
      }
    }
  };

  // --- CORE BILL SPLITTING CALCULATIONS (decimal.js) ---
  const calculations = useMemo((): CalculationResults => {
    if (!session || !session.items) {
      return {
        participantSubtotals: {},
        participantTaxes: {},
        participantTips: {},
        participantTotals: {},
        grandTotalCents: 0,
        subtotalSumCents: 0
      };
    }

    const { items, participants, globalTax, globalTip } = session;

    const participantSubtotals: { [key: string]: Decimal } = {};
    // Initialize subtotals
    participants.forEach(p => {
      participantSubtotals[p.id] = new Decimal(0);
    });

    // Calculate splits per item
    items.forEach(item => {
      const claims = item.claims || [];
      const totalWeight = claims.reduce((sum, cl) => sum + cl.splitWeight, 0);

      if (totalWeight > 0) {
        const itemAmount = new Decimal(item.amountUsd);
        claims.forEach(cl => {
          const portion = new Decimal(cl.splitWeight)
            .div(totalWeight)
            .mul(itemAmount);
          
          if (participantSubtotals[cl.participantId]) {
            participantSubtotals[cl.participantId] = participantSubtotals[cl.participantId].add(portion);
          }
        });
      }
    });

    // Subtotal sum in cents
    const subtotalSum = Object.values(participantSubtotals).reduce(
      (sum, val) => sum.add(val),
      new Decimal(0)
    );

    const participantTaxes: { [key: string]: Decimal } = {};
    const participantTips: { [key: string]: Decimal } = {};
    const participantTotals: { [key: string]: Decimal } = {};

    const taxDecimal = new Decimal(globalTax);
    const tipDecimal = new Decimal(globalTip);

    participants.forEach(p => {
      const sub = participantSubtotals[p.id] || new Decimal(0);
      
      let tax = new Decimal(0);
      let tip = new Decimal(0);

      if (subtotalSum.gt(0)) {
        // Share of tax and tip is proportional to subtotal
        tax = sub.div(subtotalSum).mul(taxDecimal);
        tip = sub.div(subtotalSum).mul(tipDecimal);
      }

      participantTaxes[p.id] = tax;
      participantTips[p.id] = tip;
      participantTotals[p.id] = sub.add(tax).add(tip);
    });

    return {
      participantSubtotals,
      participantTaxes,
      participantTips,
      participantTotals,
      subtotalSumCents: subtotalSum.toNumber(),
      grandTotalCents: subtotalSum.add(taxDecimal).add(tipDecimal).toNumber()
    };
  }, [session]);

  if (!session || !currentParticipant) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center bg-slate-50">
        <div className="h-10 w-10 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-600 text-sm font-semibold">Cargando mesa en vivo...</p>
        {error && <p className="text-red-600 mt-2 text-xs font-semibold">{error}</p>}
      </div>
    );
  }

  const isHost = session.hostId === currentUser?.id;

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50 text-slate-800 pb-16">
      
      {/* Header */}
      <header className="z-10 border-b border-slate-200 bg-white sticky top-0 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => router.push('/dashboard')}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="font-bold text-slate-900">Mesa VacaMake</h1>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
                session.status === 'ACTIVE' ? 'bg-orange-50 text-orange-600 border-orange-200' :
                session.status === 'SETTLING' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                'bg-slate-100 text-slate-500 border-slate-200'
              }`}>
                {session.status === 'ACTIVE' ? 'Activa' : session.status === 'SETTLING' ? 'Cobrando' : 'Cerrada'}
              </span>
            </div>
            <div className="flex items-center space-x-2 mt-0.5">
              <span className="text-xs text-slate-500">Código:</span>
              <button 
                onClick={handleCopyCode}
                className="inline-flex items-center space-x-1 hover:text-orange-600 text-xs font-mono font-bold text-orange-500 cursor-pointer"
              >
                <span>{session.shortCode}</span>
                <Copy className="w-3 h-3" />
              </button>
              {copiedCode && <span className="text-[10px] text-emerald-600 animate-pulse">¡Copiado!</span>}
            </div>
          </div>
        </div>

        {/* Real-time Indicator & Settings */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1.5 bg-slate-100 border border-slate-200 rounded-full px-2.5 py-1">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-[10px] text-slate-500 font-semibold uppercase">{isConnected ? 'En vivo' : 'Offline'}</span>
          </div>

          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 hover:text-slate-900 transition-all border border-transparent hover:border-slate-200"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Settings Panel Modal */}
      {showSettings && (
        <div className="z-20 fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex justify-center items-end sm:items-center p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-t-3xl sm:rounded-3xl p-6 space-y-6 shadow-xl animate-in slide-in-from-bottom duration-200">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900">Ajustes de la Mesa</h3>
              <button onClick={() => setShowSettings(false)} className="text-xs text-slate-500 hover:text-slate-900 font-semibold">Cerrar</button>
            </div>

            {/* Global Tax & Tip */}
            <div className="space-y-4 border-b border-slate-100 pb-5">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Montos Adicionales ($ USD)</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Impuestos ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={taxPercent}
                    onChange={(e) => setTaxPercent(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 text-sm focus:outline-none focus:border-orange-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Propina ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={tipPercent}
                    onChange={(e) => setTipPercent(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 text-sm focus:outline-none focus:border-orange-500 focus:bg-white"
                  />
                </div>
              </div>
              <button
                onClick={handleSaveSettings}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 rounded-xl text-xs transition-colors shadow-sm"
              >
                Aplicar Cargos
              </button>
            </div>

            {/* Exchange Rate */}
            <div className="space-y-4 border-b border-slate-100 pb-5">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tasa de Cambio Personalizada</h4>
              <p className="text-xs text-slate-500">Configura tu tasa personal (Bs. por USD) para ver tu total en bolívares.</p>
              <div className="flex space-x-2">
                <input
                  type="number"
                  step="0.01"
                  placeholder="Ej: 36.50"
                  value={customRate}
                  onChange={(e) => setCustomRate(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 text-sm focus:outline-none focus:border-orange-500 focus:bg-white"
                />
                <button
                  onClick={handleSaveRate}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 rounded-xl text-xs font-bold transition-colors"
                >
                  Guardar
                </button>
              </div>
            </div>

            {/* Host actions */}
            {isHost && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Acciones del Anfitrión</h4>
                <div className="grid grid-cols-2 gap-2">
                  {session.status === 'ACTIVE' && (
                    <button
                      onClick={() => {
                        updateSessionStatus('SETTLING');
                        setShowSettings(false);
                      }}
                      className="col-span-2 bg-amber-500 hover:bg-amber-600 text-white font-bold py-2.5 rounded-xl text-xs transition-colors shadow-sm"
                    >
                      Iniciar Cobro de Cuentas
                    </button>
                  )}
                  {session.status === 'SETTLING' && (
                    <>
                      <button
                        onClick={() => updateSessionStatus('ACTIVE')}
                        className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-2 rounded-xl text-xs transition-colors"
                      >
                        Volver a Activa
                      </button>
                      <button
                        onClick={() => {
                          updateSessionStatus('CLOSED');
                          setShowSettings(false);
                        }}
                        className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 rounded-xl text-xs transition-colors shadow-sm"
                      >
                        Cerrar Mesa
                      </button>
                    </>
                  )}
                  {session.status === 'CLOSED' && (
                    <button
                      onClick={() => updateSessionStatus('ACTIVE')}
                      className="col-span-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-2.5 rounded-xl text-xs transition-colors"
                    >
                      Reabrir Mesa
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main split interface */}
      <main className="flex-1 max-w-lg mx-auto w-full px-4 pt-4 flex flex-col">
        
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 mb-4 bg-white p-1 rounded-xl shadow-xs">
          <button
            onClick={() => setActiveTab('items')}
            className={`flex-1 py-2 text-center text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'items' ? 'bg-slate-100 text-orange-600 border-b-2 border-orange-500' : 'text-slate-500'
            }`}
          >
            Platos e Ítems
          </button>
          <button
            onClick={() => setActiveTab('participants')}
            className={`flex-1 py-2 text-center text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'participants' ? 'bg-slate-100 text-orange-600 border-b-2 border-orange-500' : 'text-slate-500'
            }`}
          >
            Mesa ({session.participants.length})
          </button>
          <button
            onClick={() => setActiveTab('summary')}
            className={`flex-1 py-2 text-center text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'summary' ? 'bg-slate-100 text-orange-600 border-b-2 border-orange-500' : 'text-slate-500'
            }`}
          >
            Mi Cuenta
          </button>
        </div>

        {/* Tab 1: Items */}
        {activeTab === 'items' && (
          <div className="flex-1 flex flex-col space-y-4">
            
            {/* Add Item Form */}
            {session.status !== 'CLOSED' && (
              <form onSubmit={handleAddItemSubmit} className={`${styles.panel} rounded-2xl p-4 flex flex-col space-y-3`}>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center">
                  <Sparkles className="w-3.5 h-3.5 text-orange-500 mr-1.5" />
                  Agregar plato o bebida
                </h3>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    required
                    placeholder="Descripción (ej. Pizza, Café)"
                    value={itemDesc}
                    onChange={(e) => setItemDesc(e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 text-sm focus:outline-none focus:border-orange-500 focus:bg-white"
                  />
                  <div className="relative w-28">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-sm">$</span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={itemCost}
                      onChange={(e) => setItemCost(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-7 pr-3 text-slate-900 text-sm focus:outline-none focus:border-orange-500 focus:bg-white"
                    />
                  </div>
                  <button
                    type="submit"
                    className="bg-orange-500 hover:bg-orange-600 text-white p-2.5 rounded-xl font-bold transition-all shadow-md flex items-center justify-center"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </form>
            )}

            {/* List of items */}
            <div className={`space-y-3 flex-1 overflow-y-auto max-h-[60vh] ${styles.noScrollbar}`}>
              {session.items.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-sm border border-dashed border-slate-300 rounded-2xl bg-white">
                  Aún no hay platos en la cuenta. Agrega uno arriba.
                </div>
              ) : (
                session.items.map((item: Item) => {
                  const isClaimedByMe = item.claims.some(cl => cl.participantId === currentParticipant.id);
                  const myClaim = item.claims.find(cl => cl.participantId === currentParticipant.id);
                  const splitTotalParticipants = item.claims.length;

                  const costDecimal = new Decimal(item.amountUsd).div(100);
                  let myPortionStr = '0.00';
                  if (isClaimedByMe && myClaim) {
                    const totalWeight = item.claims.reduce((s, c) => s + c.splitWeight, 0);
                    myPortionStr = new Decimal(myClaim.splitWeight)
                      .div(totalWeight)
                      .mul(costDecimal)
                      .toFixed(2);
                  }

                  return (
                    <div 
                      key={item.id} 
                      className={`rounded-2xl border transition-all p-4 ${
                        isClaimedByMe 
                          ? 'bg-orange-50/50 border-orange-350 shadow-xs' 
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-semibold text-slate-900 text-sm">{item.description}</h4>
                          <span className="text-[10px] text-slate-400">Agregado por: {item.addedBy}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-slate-900 text-sm">${costDecimal.toFixed(2)}</span>
                          {splitTotalParticipants > 0 && (
                            <div className="text-[10px] text-slate-500">
                              {splitTotalParticipants} {splitTotalParticipants === 1 ? 'persona' : 'personas'}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Claims tags */}
                      <div className="flex flex-wrap gap-1.5 items-center mb-3">
                        {item.claims.map((cl) => {
                          const part = session.participants.find(p => p.id === cl.participantId);
                          if (!part) return null;
                          return (
                            <span 
                              key={cl.id} 
                              className={`text-[10px] px-2 py-0.5 rounded-md font-medium ${
                                part.id === currentParticipant.id 
                                  ? 'bg-orange-500 text-white font-bold' 
                                  : 'bg-slate-100 text-slate-600 border border-slate-200/50'
                              }`}
                            >
                              @{part.user.username} {cl.splitWeight > 1 ? `(x{cl.splitWeight})` : ''}
                            </span>
                          );
                        })}
                      </div>

                      {/* Split controls */}
                      <div className="flex items-center justify-between pt-2.5 border-t border-slate-100">
                        <button
                          onClick={() => toggleClaim(item.id)}
                          className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                            isClaimedByMe 
                              ? 'bg-orange-50 text-orange-600 border-orange-200' 
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:text-slate-900'
                          }`}
                        >
                          {isClaimedByMe ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-orange-600" />
                              <span>Mi Plato (${myPortionStr})</span>
                            </>
                          ) : (
                            <span>Reclamar Plato</span>
                          )}
                        </button>

                        <div className="flex items-center space-x-2">
                          {/* Split weight adjustment */}
                          {isClaimedByMe && myClaim && (
                            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-0.5">
                              <button
                                onClick={() => updateSplitWeight(item.id, myClaim.splitWeight - 1)}
                                disabled={myClaim.splitWeight <= 1}
                                className="w-6 h-6 flex items-center justify-center text-slate-500 hover:text-slate-800 disabled:opacity-30 text-xs font-bold"
                              >
                                -
                              </button>
                              <span className="text-[10px] text-slate-700 px-2 font-mono">{myClaim.splitWeight}x</span>
                              <button
                                onClick={() => updateSplitWeight(item.id, myClaim.splitWeight + 1)}
                                className="w-6 h-6 flex items-center justify-center text-slate-500 hover:text-slate-800 text-xs font-bold"
                              >
                                +
                              </button>
                            </div>
                          )}

                          <button
                            onClick={() => deleteItem(item.id)}
                            className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Participants */}
        {activeTab === 'participants' && (
          <div className="flex-1 flex flex-col space-y-4">
            
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center">
                <Users className="w-4 h-4 text-orange-500 mr-2" />
                Participantes de la Mesa
              </h3>
              
              <div className="space-y-3">
                {session.participants.map((part: Participant) => {
                  const subTotalDec = calculations.participantTotals[part.id] 
                    ? calculations.participantTotals[part.id].div(100) 
                    : new Decimal(0);

                  const hasRate = !!part.exchangeRate;
                  const totalBs = hasRate && calculations.participantTotals[part.id]
                    ? calculations.participantTotals[part.id].div(100).mul(new Decimal(part.exchangeRate!)).toFixed(2)
                    : null;

                  return (
                    <div 
                      key={part.id} 
                      className={`flex justify-between items-center p-3 rounded-xl border ${
                        part.id === currentParticipant.id 
                          ? 'bg-slate-50 border-slate-350' 
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                          part.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' :
                          part.status === 'READY' ? 'bg-amber-100 text-amber-700 animate-pulse' :
                          'bg-slate-100 text-slate-500'
                        }`}>
                          {part.user.username.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center space-x-1.5">
                            <span className="text-sm font-semibold text-slate-900">@{part.user.username}</span>
                            {session.hostId === part.userId && (
                              <span className="text-[9px] bg-orange-100 text-orange-700 px-1.5 py-0.2 rounded border border-orange-200 font-bold uppercase">Host</span>
                            )}
                          </div>
                          <div className="flex items-center space-x-2 mt-0.5">
                            <span className="text-[10px] text-slate-500">
                              {part.paymentMethod ? part.paymentMethod.replace('_', ' ') : 'Sin método de pago'}
                            </span>
                            {part.exchangeRate && (
                              <span className="text-[9px] text-orange-600 font-mono">Tasa: Bs. {parseFloat(part.exchangeRate).toFixed(2)}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right flex flex-col items-end">
                        <span className="text-sm font-bold text-slate-900">${subTotalDec.toFixed(2)}</span>
                        {totalBs && (
                          <span className="text-[10px] text-orange-600 font-mono font-medium">Bs. {totalBs}</span>
                        )}
                        <span className={`text-[9px] font-bold uppercase mt-1 px-1.5 py-0.2 rounded ${
                          part.status === 'PAID' ? 'bg-emerald-100 text-emerald-700 border border-emerald-250' :
                          part.status === 'READY' ? 'bg-amber-100 text-amber-700 border border-amber-250' :
                          'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}>
                          {part.status === 'PAID' ? 'PAGÓ' :
                           part.status === 'READY' ? 'Listo' :
                           'Eligiendo'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Settle actions */}
            <div className={`${styles.panelGlow} rounded-3xl p-5 space-y-4`}>
              <h3 className="text-sm font-bold text-slate-900">Mi Estado de Pago</h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => updateStatus(currentParticipant.status === 'READY' ? 'JOINED' : 'READY')}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all border ${
                    currentParticipant.status === 'READY'
                      ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-55'
                  }`}
                >
                  {currentParticipant.status === 'READY' ? '✓ Estoy Listo' : 'Marcar como Listo'}
                </button>

                <button
                  onClick={() => updateStatus(currentParticipant.status === 'PAID' ? 'JOINED' : 'PAID')}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all border ${
                    currentParticipant.status === 'PAID'
                      ? 'bg-emerald-500 text-white border-emerald-600 shadow-xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-55'
                  }`}
                >
                  {currentParticipant.status === 'PAID' ? '✓ Ya pagué' : 'Marcar como Pagado'}
                </button>
              </div>

              {/* Payment methods */}
              <div className="space-y-2">
                <label className="block text-xs text-slate-500">Método de pago:</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['ZELLE', 'PAGO_MOVIL', 'EFECTIVO_USD', 'CASH_BS', 'BINANCE'] as PaymentMethod[]).map((method) => (
                    <button
                      key={method}
                      onClick={() => updatePaymentMethod(method)}
                      className={`py-2 px-1 rounded-lg text-[10px] font-bold border truncate transition-all ${
                        currentParticipant.paymentMethod === method
                          ? 'bg-orange-500 text-white border-orange-500'
                          : 'bg-white text-slate-500 border-slate-200 hover:text-slate-800'
                      }`}
                    >
                      {method.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Resumen */}
        {activeTab === 'summary' && (
          <div className="flex-1 flex flex-col space-y-4">
            
            {/* Calculation card */}
            <div className={`${styles.panelGlow} rounded-3xl p-6 relative overflow-hidden`}>
              <div className="absolute top-0 right-0 p-4 opacity-5">
                <Utensils className="w-32 h-32 text-orange-500" />
              </div>

              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-5">Mi Resumen de Cuenta</h3>
              
              <div className="space-y-4 border-b border-slate-100 pb-5">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Consumo Neto:</span>
                  <span className="font-semibold text-slate-900">
                    ${(calculations.participantSubtotals[currentParticipant.id] || new Decimal(0)).div(100).toFixed(2)}
                  </span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Impuestos proporcionales:</span>
                  <span className="font-semibold text-slate-900">
                    ${(calculations.participantTaxes[currentParticipant.id] || new Decimal(0)).div(100).toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Propina proporcional:</span>
                  <span className="font-semibold text-slate-900">
                    ${(calculations.participantTips[currentParticipant.id] || new Decimal(0)).div(100).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="pt-5 space-y-3">
                <div className="flex justify-between items-baseline">
                  <span className="text-base font-bold text-slate-950">Mi Total a pagar:</span>
                  <div className="text-right">
                    <div className="text-2xl font-extrabold text-orange-500 font-display">
                      ${(calculations.participantTotals[currentParticipant.id] || new Decimal(0)).div(100).toFixed(2)}
                    </div>
                    
                    {currentParticipant.exchangeRate && calculations.participantTotals[currentParticipant.id] && (
                      <div className="text-sm font-semibold text-orange-600 font-mono mt-1">
                        Bs. {calculations.participantTotals[currentParticipant.id]
                          .div(100)
                          .mul(new Decimal(currentParticipant.exchangeRate))
                          .toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>

                {!currentParticipant.exchangeRate && (
                  <p className="text-[10px] text-slate-400 italic text-center pt-2">
                    Tip: Configura una tasa en ajustes para ver este monto en Bolívares (Bs.).
                  </p>
                )}
              </div>
            </div>

            {/* Complete bill details */}
            <div className={`${styles.panel} rounded-3xl p-5 space-y-4`}>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Detalle de Mesa Completo</h3>
              
              <div className="space-y-2.5">
                <div className="flex justify-between text-xs text-slate-500 border-b border-slate-100 pb-2">
                  <span>Subtotal Platos:</span>
                  <span className="font-semibold text-slate-800">${new Decimal(calculations.subtotalSumCents).div(100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-500 border-b border-slate-100 pb-2">
                  <span>Impuestos Totales:</span>
                  <span className="font-semibold text-slate-800">${new Decimal(session.globalTax).div(100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-500 border-b border-slate-100 pb-2">
                  <span>Propina Total:</span>
                  <span className="font-semibold text-slate-800">${new Decimal(session.globalTip).div(100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-slate-900 font-bold pt-1">
                  <span>Total de Mesa:</span>
                  <span className="text-orange-500">${new Decimal(calculations.grandTotalCents).div(100).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
