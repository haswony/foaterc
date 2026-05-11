import type { Context, Next } from 'hono';
import jwt from 'jsonwebtoken';
import type { Role } from '@prisma/client';
import type { AuthUser, AppVariables } from '../types.js';

export function signToken(user: AuthUser): string {
  const secret = process.env.JWT_SECRET || 'dev-secret';
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign(user, secret, { expiresIn } as jwt.SignOptions);
}

export async function authMiddleware(c: Context<{ Variables: AppVariables }>, next: Next) {
  const header = c.req.header('Authorization');
  if (!header || !header.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret') as AuthUser;
    c.set('user', payload);
    await next();
  } catch {
    return c.json({ error: 'Invalid token' }, 401);
  }
}

export function requireRole(...roles: Role[]) {
  return async (c: Context<{ Variables: AppVariables }>, next: Next) => {
    const user = c.get('user');
    if (!user || !roles.includes(user.role)) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    await next();
  };
}

/**
 * Resolves the storeId scope for the current request.
 * - SUPER_ADMIN may pass ?storeId=... or X-Store-Id header to scope, otherwise null (all).
 * - STORE_OWNER / STAFF: always their own storeId.
 */
export function getScopedStoreId(c: Context<{ Variables: AppVariables }>): string | null {
  const user = c.get('user');
  if (!user) return null;
  if (user.role === 'SUPER_ADMIN') {
    return c.req.query('storeId') || c.req.header('X-Store-Id') || null;
  }
  return user.storeId;
}

/** Like getScopedStoreId but throws if there's no store scope (required for store-only endpoints). */
export function requireStoreId(c: Context<{ Variables: AppVariables }>): string {
  const id = getScopedStoreId(c);
  if (!id) {
    throw new Error('STORE_REQUIRED');
  }
  return id;
}
