import { Request, Response, NextFunction } from 'express';
import { User, UserRole } from '../src/types/user';
import { logger } from './logger';

export interface RLSContext {
  userId: string;
  userEmail: string;
  role: UserRole;
  permissions: string[];
}

export class RLSSecurityError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode = 403, code = 'RLS_ACCESS_DENIED') {
    super(message);
    this.name = 'RLSSecurityError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

/**
 * Validates whether an RLSContext has permission to read a given row.
 * - Admin and Manager roles have global visibility.
 * - Analysts and Viewers can only view rows assigned to them, or shared system rows.
 */
export function canReadRow(ctx: RLSContext, rowUserId?: string | null): boolean {
  if (ctx.role === 'admin' || ctx.role === 'manager') {
    return true;
  }
  if (!rowUserId) {
    return true; // Legacy/shared row
  }
  return rowUserId === ctx.userId;
}

/**
 * Validates whether an RLSContext has permission to mutate (create/update/delete) a given row.
 * - Viewers can NEVER mutate rows.
 * - Admins can mutate any row.
 * - Managers can mutate any row except other admins' configurations.
 * - Analysts can only mutate rows where rowUserId matches their userId (or newly created).
 */
export function canMutateRow(ctx: RLSContext, rowUserId?: string | null): boolean {
  if (ctx.role === 'viewer') {
    return false;
  }
  if (ctx.role === 'admin') {
    return true;
  }
  if (ctx.role === 'manager') {
    return true;
  }
  if (!rowUserId) {
    return true;
  }
  return rowUserId === ctx.userId;
}

/**
 * Express Middleware: Enforces that the authenticated user possesses a specific permission ID
 * or is a system administrator.
 */
export function requirePermission(permissionId: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user as User | undefined;

    if (!user) {
      logger.warn('Unauthenticated access attempt to protected permission route', {
        reqId: req.id,
        path: req.originalUrl,
        requiredPermission: permissionId,
      });
      return res.status(401).json({
        error: 'Acesso não autorizado. Autenticação obrigatória.',
        code: 'AUTH_REQUIRED',
      });
    }

    // Admins bypass granular checks
    if (user.role === 'admin') {
      return next();
    }

    const hasPerm = Array.isArray(user.permissions) && user.permissions.includes(permissionId);
    if (!hasPerm) {
      logger.warn('RLS/RBAC Permission Denied: insufficient privileges', {
        reqId: req.id,
        userId: user.id,
        userRole: user.role,
        requiredPermission: permissionId,
        path: req.originalUrl,
        method: req.method,
      });

      return res.status(403).json({
        error: `Acesso negado por RLS/RBAC. Sua conta não possui a permissão '${permissionId}'.`,
        code: 'RLS_INSUFFICIENT_PERMISSIONS',
        requiredPermission: permissionId,
      });
    }

    next();
  };
}

/**
 * Attaches the typed RLSContext to the request object.
 */
export function attachRLSContext(req: Request, _res: Response, next: NextFunction): void {
  const user = (req as any).user as User | undefined;
  if (user) {
    (req as any).rlsContext = {
      userId: user.id,
      userEmail: user.email,
      role: user.role,
      permissions: user.permissions || [],
    } as RLSContext;
  }
  next();
}
