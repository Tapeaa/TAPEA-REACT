import { io, Socket } from 'socket.io-client';
import Constants from 'expo-constants';
import type { Order, LocationUpdate } from './types';

const API_URL = Constants.expoConfig?.extra?.apiUrl || process.env.EXPO_PUBLIC_API_URL || '';

let socket: Socket | null = null;

// Stockage des callbacks pour réinscription après reconnexion
const reconnectCallbacks: Array<() => void> = [];

// Fonction pour réinscrire tous les listeners après reconnexion
function rejoinRoomsAfterReconnect() {
  reconnectCallbacks.forEach(callback => {
    try {
      callback();
    } catch (error) {
      console.error('[Socket] Error re-executing reconnect callback:', error);
    }
  });
}

export function getSocket(): Socket {
  if (!socket) {
    socket = io(API_URL, {
      autoConnect: false,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity, // Tentatives infinies
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000, // Max 10 secondes entre tentatives
      timeout: 20000,
      forceNew: false, // Réutiliser la connexion si possible
    });

    // Gestion des événements de reconnexion
    socket.on('connect', () => {
      console.log('[Socket] Connected');
      // Réinscrire tous les listeners après reconnexion
      rejoinRoomsAfterReconnect();
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
      if (reason === 'io server disconnect') {
        // Le serveur a déconnecté, reconnecter manuellement
        socket?.connect();
      }
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log(`[Socket] Reconnected after ${attemptNumber} attempts`);
      // Réinscrire tous les listeners après reconnexion
      rejoinRoomsAfterReconnect();
    });

    socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`[Socket] Reconnection attempt ${attemptNumber}`);
    });

    socket.on('reconnect_error', (error) => {
      console.error('[Socket] Reconnection error:', error.message);
    });

    socket.on('reconnect_failed', () => {
      console.error('[Socket] Reconnection failed after all attempts');
      // Essayer de reconnecter manuellement après un délai
      setTimeout(() => {
        if (socket && !socket.connected) {
          console.log('[Socket] Attempting manual reconnection...');
          socket.connect();
        }
      }, 5000);
    });

    socket.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error.message);
    });
  }
  return socket;
}

export function connectSocket(): Socket {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
  }
  return s;
}

export function isSocketConnected(): boolean {
  return socket?.connected ?? false;
}

export async function connectSocketAsync(): Promise<Socket> {
  const s = getSocket();

  if (s.connected) {
    return s;
  }

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Socket connection timeout'));
    }, 10000);

    s.once('connect', () => {
      clearTimeout(timeout);
      console.log('Socket connected successfully');
      resolve(s);
    });

    s.once('connect_error', (error) => {
      clearTimeout(timeout);
      console.error('Socket connection error:', error);
      reject(error);
    });

    s.connect();
  });
}

export function disconnectSocket(): void {
  if (socket?.connected) {
    socket.disconnect();
  }
}

export async function joinDriverSessionAsync(sessionId: string): Promise<boolean> {
  try {
    const s = await connectSocketAsync();

    return new Promise((resolve) => {
      s.emit('driver:join', { sessionId }, (ack: { success: boolean }) => {
        if (ack?.success) {
          console.log('Joined driver session successfully:', sessionId);
          resolve(true);
        } else {
          console.warn('Join driver session failed:', sessionId);
          resolve(false);
        }
      });

      setTimeout(() => {
        console.log('Join session no ack, assuming success');
        resolve(true);
      }, 3000);
    });
  } catch (error) {
    console.error('Failed to join driver session:', error);
    return false;
  }
}

export function joinDriverSession(sessionId: string): void {
  const s = getSocket();
  
  const joinSession = () => {
    if (s.connected) {
      s.emit('driver:join', { sessionId });
      console.log(`[Socket] Driver joined session: ${sessionId}`);
    }
  };

  // Enregistrer le callback pour réinscription après reconnexion
  reconnectCallbacks.push(joinSession);

  if (s.connected) {
    joinSession();
  } else {
    s.once('connect', joinSession);
    s.connect();
  }
}

export function updateDriverStatus(sessionId: string, isOnline: boolean): void {
  const s = getSocket();
  if (s.connected) {
    s.emit('driver:status', { sessionId, isOnline });
  }
}

export function acceptOrder(orderId: string, sessionId: string): void {
  const s = getSocket();
  if (s.connected) {
    s.emit('order:accept', { orderId, sessionId });
  }
}

export function declineOrder(orderId: string, sessionId: string): void {
  const s = getSocket();
  if (s.connected) {
    s.emit('order:decline', { orderId, sessionId });
  }
}

export function onNewOrder(callback: (order: Order) => void): () => void {
  const s = getSocket();
  s.on('order:new', callback);
  return () => s.off('order:new', callback);
}

export function onPendingOrders(callback: (orders: Order[]) => void): () => void {
  const s = getSocket();
  s.on('orders:pending', callback);
  return () => s.off('orders:pending', callback);
}

export function onOrderTaken(callback: (data: { orderId: string }) => void): () => void {
  const s = getSocket();
  s.on('order:taken', callback);
  return () => s.off('order:taken', callback);
}

export function onOrderExpired(callback: (data: { orderId: string }) => void): () => void {
  const s = getSocket();
  s.on('order:expired', callback);
  return () => s.off('order:expired', callback);
}

export function onOrderAcceptSuccess(callback: (order: Order) => void): () => void {
  const s = getSocket();
  s.on('order:accept:success', callback);
  return () => s.off('order:accept:success', callback);
}

export function onOrderAcceptError(callback: (data: { message: string }) => void): () => void {
  const s = getSocket();
  s.on('order:accept:error', callback);
  return () => s.off('order:accept:error', callback);
}

export function joinClientSession(orderId: string, clientToken?: string): void {
  const s = getSocket();
  
  const joinSession = () => {
    if (s.connected) {
      s.emit('client:join', { orderId, clientToken });
      console.log(`[Socket] Client joined session: ${orderId} with token: ${clientToken ? 'yes' : 'no'}`);
    }
  };

  // Enregistrer le callback pour réinscription après reconnexion
  reconnectCallbacks.push(joinSession);

  if (s.connected) {
    joinSession();
  } else {
    s.once('connect', joinSession);
    s.connect();
  }
}

export function onClientJoinError(
  callback: (data: { message: string }) => void
): () => void {
  const s = getSocket();
  s.on('client:join:error', callback);
  return () => s.off('client:join:error', callback);
}

export function onDriverAssigned(
  callback: (data: {
    orderId: string;
    driverName: string;
    driverId: string;
    sessionId: string;
  }) => void
): () => void {
  const s = getSocket();
  s.on('order:driver:assigned', callback);
  return () => s.off('order:driver:assigned', callback);
}

export function updateRideStatus(
  orderId: string,
  sessionId: string,
  status: 'enroute' | 'arrived' | 'inprogress' | 'completed'
): void {
  const s = getSocket();
  if (s.connected) {
    s.emit('ride:status:update', { orderId, sessionId, status });
  }
}

export function joinRideRoom(
  orderId: string,
  role: 'driver' | 'client' = 'driver',
  credentials?: { sessionId?: string; clientToken?: string }
): void {
  const s = getSocket();
  const payload = { orderId, role, ...credentials };

  const joinRoom = () => {
    if (s.connected) {
      s.emit('ride:join', payload);
      console.log(`[Socket] Joined ride room: ${orderId} as ${role}`);
    }
  };

  // Enregistrer le callback pour réinscription après reconnexion
  reconnectCallbacks.push(joinRoom);

  if (s.connected) {
    joinRoom();
  } else {
    s.once('connect', joinRoom);
    s.connect();
  }
}

export function onRideStatusChanged(
  callback: (data: {
    orderId: string;
    status: 'enroute' | 'arrived' | 'inprogress' | 'completed';
    orderStatus: string;
    driverName: string;
  }) => void
): () => void {
  const s = getSocket();
  s.on('ride:status:changed', callback);
  return () => s.off('ride:status:changed', callback);
}

export function confirmPayment(
  orderId: string,
  confirmed: boolean,
  role: 'driver' | 'client',
  credentials?: { sessionId?: string; clientToken?: string }
): void {
  const s = getSocket();
  if (s.connected) {
    s.emit('payment:confirm', { orderId, confirmed, role, ...credentials });
  }
}

export function onPaymentStatus(
  callback: (data: {
    orderId: string;
    status: string;
    confirmed: boolean;
    driverConfirmed?: boolean;
    clientConfirmed?: boolean;
    amount?: number;
    paymentMethod?: string;
    cardBrand?: string | null;
    cardLast4?: string | null;
    errorMessage?: string;
  }) => void
): () => void {
  const s = getSocket();
  s.on('payment:status', callback);
  return () => s.off('payment:status', callback);
}

export function retryPayment(orderId: string, clientToken: string): void {
  const s = getSocket();
  if (s.connected) {
    s.emit('payment:retry', { orderId, clientToken });
  }
}

export function switchToCashPayment(orderId: string, clientToken: string): void {
  const s = getSocket();
  if (s.connected) {
    s.emit('payment:switch-cash', { orderId, clientToken });
    console.log(`[Socket] payment:switch-cash emitted for order ${orderId}`);
  }
}

export function onPaymentRetryReady(
  callback: (data: {
    orderId: string;
    message: string;
  }) => void
): () => void {
  const s = getSocket();
  s.on('payment:retry:ready', callback);
  return () => s.off('payment:retry:ready', callback);
}

export function onPaymentSwitchedToCash(
  callback: (data: {
    orderId: string;
    amount: number;
    message: string;
  }) => void
): () => void {
  const s = getSocket();
  s.on('payment:switched-to-cash', callback);
  return () => s.off('payment:switched-to-cash', callback);
}

export function cancelRide(
  orderId: string,
  role: 'driver' | 'client',
  reason?: string,
  credentials?: { sessionId?: string; clientToken?: string }
): void {
  const s = getSocket();
  if (s.connected) {
    s.emit('ride:cancel', { orderId, role, reason, ...credentials });
  }
}

export function onRideCancelled(
  callback: (data: {
    orderId: string;
    cancelledBy: 'driver' | 'client';
    reason: string;
  }) => void
): () => void {
  const s = getSocket();
  s.on('ride:cancelled', callback);
  return () => s.off('ride:cancelled', callback);
}

export function emitDriverLocation(
  orderId: string,
  sessionId: string,
  lat: number,
  lng: number,
  heading?: number,
  speed?: number
): void {
  const s = getSocket();
  if (s.connected) {
    s.emit('location:driver:update', {
      orderId,
      sessionId,
      lat,
      lng,
      heading,
      speed,
      timestamp: Date.now(),
    });
  }
}

export function emitClientLocation(
  orderId: string,
  clientToken: string,
  lat: number,
  lng: number
): void {
  const s = getSocket();
  if (s.connected) {
    s.emit('location:client:update', {
      orderId,
      clientToken,
      lat,
      lng,
      timestamp: Date.now(),
    });
  }
}

export function onDriverLocationUpdate(callback: (data: LocationUpdate) => void): () => void {
  const s = getSocket();
  s.on('location:driver', callback);
  return () => s.off('location:driver', callback);
}

export function onClientLocationUpdate(callback: (data: LocationUpdate) => void): () => void {
  const s = getSocket();
  s.on('location:client', callback);
  return () => s.off('location:client', callback);
}

export function calculateHeading(
  prevLat: number,
  prevLng: number,
  currLat: number,
  currLng: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;

  const dLng = toRad(currLng - prevLng);
  const lat1 = toRad(prevLat);
  const lat2 = toRad(currLat);

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

  let bearing = toDeg(Math.atan2(y, x));
  return (bearing + 360) % 360;
}
