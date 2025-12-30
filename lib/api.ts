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

export class ApiError extends Error {
  status: number;
  isNetworkError: boolean;
  isServerError: boolean;

  constructor(message: string, status: number = 0, isNetworkError: boolean = false) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.isNetworkError = isNetworkError;
    this.isServerError = status >= 500;
  }
}

export async function apiFetch<T = unknown>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { skipAuth = false, ...fetchOptions } = options;
  
  if (!API_URL) {
    throw new ApiError(
      'Serveur non configuré. L\'application fonctionne en mode hors-ligne.',
      0,
      true
    );
  }

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

  let response: Response;
  try {
    response = await fetch(url, {
      ...fetchOptions,
      headers,
    });
  } catch (networkError) {
    throw new ApiError(
      'Impossible de contacter le serveur. Vérifiez votre connexion internet.',
      0,
      true
    );
  }

  const contentType = response.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');

  if (!isJson) {
    if (response.status === 404) {
      throw new ApiError('Page non trouvée sur le serveur.', 404);
    }
    if (response.status === 403) {
      throw new ApiError('Accès refusé par le serveur.', 403);
    }
    if (response.status >= 500) {
      throw new ApiError('Le serveur rencontre un problème. Réessayez plus tard.', response.status);
    }
    throw new ApiError(
      'Le serveur a renvoyé une réponse invalide. L\'API n\'est peut-être pas disponible.',
      response.status
    );
  }

  let data: any;
  try {
    data = await response.json();
  } catch {
    throw new ApiError('Réponse du serveur invalide.', response.status);
  }

  if (!response.ok) {
    throw new ApiError(
      data.error || data.message || 'Une erreur est survenue',
      response.status
    );
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
