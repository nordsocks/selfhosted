import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { db, shUsersTable } from "../db";
import { eq } from "drizzle-orm";

const JWT_SECRET = process.env.SELFHOSTED_JWT_SECRET ?? process.env.JWT_SECRET ?? "selfhosted-dev-secret-change-in-production";

export interface JwtPayload {
  userId: number;
  email: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized", message: "Missing or invalid authorization header" });
    return;
  }
  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.user = payload;

    db.select({ isBlocked: shUsersTable.isBlocked })
      .from(shUsersTable)
      .where(eq(shUsersTable.id, payload.userId))
      .then(([user]) => {
        if (!user) { res.status(401).json({ error: "Unauthorized", message: "User not found" }); return; }
        if (user.isBlocked) { res.status(403).json({ error: "Forbidden", message: "Your account has been blocked" }); return; }
        next();
      })
      .catch(() => next());
  } catch {
    res.status(401).json({ error: "Unauthorized", message: "Invalid or expired token" });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== "admin") {
    res.status(403).json({ error: "Forbidden", message: "Admin access required" });
    return;
  }
  next();
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}
