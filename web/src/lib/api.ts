import { useAuthStore } from '@/store/auth';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function api<T = any>(
  path: string,
  options: RequestInit & { storeId?: string | null } = {},
): Promise<T> {
  const token = useAuthStore.getState().token;
  const activeStoreId = useAuthStore.getState().activeStoreId;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const sid = options.storeId !== undefined ? options.storeId : activeStoreId;
  if (sid) headers['X-Store-Id'] = sid;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    if (res.status === 401) useAuthStore.getState().logout();
    throw new ApiError(data?.error || 'حدث خطأ', res.status);
  }
  return data as T;
}
