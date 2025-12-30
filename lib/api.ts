import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.apiUrl || process.env.EXPO_PUBLIC_API_URL || '';

const CLIENT_SESSION_KEY = 'clientSessionId';
const DRIVER_SESSION_KEY = 'driverSessionId';

export async function getClientSessionId(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(CLIENT_SESSION_KEY);
  } catch {
    return null;
  }
}

export async function setClientSessionId(sessionId: string): Promise<void> {
  await SecureStore.setItemAsync(CLIENT_SESSION_KEY, sessionId);
}

export async function removeClientSessionId(): Promise<void> {
  await SecureStore.deleteItemAsync(CLIENT_SESSION_KEY);
}

export async function getDriverSessionId(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(DRIVER_SESSION_KEY);
  } catch {
    return null;
  }
}

export async function setDriverSessionId(sessionId: string): Promise<void> {
  await SecureStore.setItemAsync(DRIVER_SESSION_KEY, sessionId);
}

export async function removeDriverSessionId(): Promise<void> {
  await SecureStore.deleteItemAsync(DRIVER_SESSION_KEY);
}

interface FetchOptions extends RequestInit {
  skipAuth?: boolean;
}

export async function apiFetch<T = unknown>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { skipAuth = false, ...fetchOptions } = options;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (!skipAuth) {
    const sessionId = await getClientSessionId();
    if (sessionId) {
      headers['Cookie'] = `clientSessionId=${sessionId}`;
    }
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint}`;

  const response = await fetch(url, {
    ...fetchOptions,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || data.message || 'Une erreur est survenue');
  }

  return data as T;
}

export async function apiPost<T = unknown>(
  endpoint: string,
  body: Record<string, unknown>,
  options: FetchOptions = {}
): Promise<T> {
  return apiFetch<T>(endpoint, {
    method: 'POST',
    body: JSON.stringify(body),
    ...options,
  });
}

export async function apiPatch<T = unknown>(
  endpoint: string,
  body: Record<string, unknown>,
  options: FetchOptions = {}
): Promise<T> {
  return apiFetch<T>(endpoint, {
    method: 'PATCH',
    body: JSON.stringify(body),
    ...options,
  });
}

export async function apiDelete<T = unknown>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  return apiFetch<T>(endpoint, {
    method: 'DELETE',
    ...options,
  });
}
