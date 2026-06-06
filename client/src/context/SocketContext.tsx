'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

export type SessionStatus = 'ACTIVE' | 'SETTLING' | 'CLOSED';
export type PartStatus = 'JOINED' | 'READY' | 'PAID';
export type PaymentMethod = 'ZELLE' | 'PAGO_MOVIL' | 'EFECTIVO_USD' | 'CASH_BS' | 'BINANCE';

export interface User {
  id: string;
  username: string;
  email: string;
}

export interface Claim {
  id: string;
  itemId: string;
  participantId: string;
  splitWeight: number;
}

export interface Item {
  id: string;
  sessionId: string;
  description: string | null;
  amountUsd: number; // in cents
  addedBy: string;
  createdAt: string;
  claims: Claim[];
}

export interface Participant {
  id: string;
  userId: string;
  sessionId: string;
  joinedAt: string;
  paymentMethod: PaymentMethod | null;
  exchangeRate: string | null; // Decimal in DB
  status: PartStatus;
  user: User;
}

export interface Session {
  id: string;
  shortCode: string;
  hostId: string;
  status: SessionStatus;
  globalTip: number; // in cents
  globalTax: number; // in cents
  createdAt: string;
  updatedAt: string;
  items: Item[];
  participants: Participant[];
}

interface SocketContextProps {
  socket: Socket | null;
  isConnected: boolean;
  session: Session | null;
  currentParticipant: Participant | null;
  currentUser: User | null;
  error: string | null;
  connectSocket: (token: string) => void;
  disconnectSocket: () => void;
  joinSessionRoom: (sessionId: string) => void;
  addItem: (description: string, amountUsd: number) => void;
  deleteItem: (itemId: string) => void;
  toggleClaim: (itemId: string) => void;
  updateSplitWeight: (itemId: string, splitWeight: number) => void;
  updateSessionSettings: (globalTax: number, globalTip: number) => void;
  updateExchangeRate: (rate: number | null) => void;
  updatePaymentMethod: (method: PaymentMethod | null) => void;
  updateStatus: (status: PartStatus) => void;
  updateSessionStatus: (status: SessionStatus) => void;
}

const SocketContext = createContext<SocketContextProps | undefined>(undefined);

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialize currentUser from localStorage (client-side only)
  useEffect(() => {
    const storedUser = localStorage.getItem('vacamake_user');
    if (storedUser) {
      try {
        setCurrentUser(JSON.parse(storedUser));
      } catch (e) {
        console.error('Failed to parse stored user', e);
      }
    }
  }, []);

  const disconnectSocket = useCallback(() => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
      setIsConnected(false);
      setSession(null);
      setCurrentUser(null);
    }
  }, [socket]);

  const connectSocket = useCallback((token: string) => {
    if (socket) {
      socket.disconnect();
    }

    // Load currentUser from localStorage as it might have been set recently via login/register
    const storedUser = localStorage.getItem('vacamake_user');
    if (storedUser) {
      try {
        setCurrentUser(JSON.parse(storedUser));
      } catch (e) {
        console.error('Failed to parse stored user in connectSocket', e);
      }
    }

    const newSocket = io(SOCKET_URL, {
      auth: { token },
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      setError(null);
      console.log('Socket.io connected to server');
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Socket.io disconnected');
    });

    newSocket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
      setError(err.message);
      setIsConnected(false);
    });

    newSocket.on('session_updated', (updatedSession: Session) => {
      console.log('Session state updated:', updatedSession);
      setSession(updatedSession);
    });

    newSocket.on('error_message', (msg: string) => {
      console.warn('Socket error message from server:', msg);
      setError(msg);
    });

    setSocket(newSocket);
  }, [socket]);

  // Handle auto-connecting on reload if token exists
  useEffect(() => {
    const token = localStorage.getItem('vacamake_token');
    if (token && !socket) {
      connectSocket(token);
    }
    return () => {
      // Don't auto-disconnect to preserve connection between route changes in app, 
      // but clean up listeners if the provider unmounts completely
    };
  }, [connectSocket, socket]);

  // Room & split interactions wrappers
  const joinSessionRoom = useCallback((sessionId: string) => {
    if (socket) {
      socket.emit('join_session', { sessionId });
    }
  }, [socket]);

  const addItem = useCallback((description: string, amountUsd: number) => {
    if (socket && session) {
      socket.emit('add_item', { sessionId: session.id, description, amountUsd });
    }
  }, [socket, session]);

  const deleteItem = useCallback((itemId: string) => {
    if (socket && session) {
      socket.emit('delete_item', { sessionId: session.id, itemId });
    }
  }, [socket, session]);

  const toggleClaim = useCallback((itemId: string) => {
    if (socket && session) {
      socket.emit('toggle_claim', { sessionId: session.id, itemId });
    }
  }, [socket, session]);

  const updateSplitWeight = useCallback((itemId: string, splitWeight: number) => {
    if (socket && session) {
      socket.emit('update_split_weight', { sessionId: session.id, itemId, splitWeight });
    }
  }, [socket, session]);

  const updateSessionSettings = useCallback((globalTax: number, globalTip: number) => {
    if (socket && session) {
      socket.emit('update_session_settings', { sessionId: session.id, globalTax, globalTip });
    }
  }, [socket, session]);

  const updateExchangeRate = useCallback((rate: number | null) => {
    if (socket && session) {
      socket.emit('update_exchange_rate', { sessionId: session.id, exchangeRate: rate });
    }
  }, [socket, session]);

  const updatePaymentMethod = useCallback((method: PaymentMethod | null) => {
    if (socket && session) {
      socket.emit('update_payment_method', { sessionId: session.id, paymentMethod: method });
    }
  }, [socket, session]);

  const updateStatus = useCallback((status: PartStatus) => {
    if (socket && session) {
      socket.emit('update_status', { sessionId: session.id, status });
    }
  }, [socket, session]);

  const updateSessionStatus = useCallback((status: SessionStatus) => {
    if (socket && session) {
      socket.emit('update_session_status', { sessionId: session.id, status });
    }
  }, [socket, session]);

  // Identify current user's participant object in this room
  const currentParticipant = session?.participants.find(p => p.userId === currentUser?.id) || null;

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        session,
        currentParticipant,
        currentUser,
        error,
        connectSocket,
        disconnectSocket,
        joinSessionRoom,
        addItem,
        deleteItem,
        toggleClaim,
        updateSplitWeight,
        updateSessionSettings,
        updateExchangeRate,
        updatePaymentMethod,
        updateStatus,
        updateSessionStatus,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}
