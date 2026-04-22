import { Router, type IRouter } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import * as OTPAuth from "otpauth";
import { db, shUsersTable } from "../db";
import { eq } from "drizzle-orm";
import { authenticate, signToken } from "../middlewares/auth";
import { z } from "zod";

const router: IRouter = Router();

const JWT_SECRET = process.env.SELFHOSTED_JWT_SECRET ?? process.env.JWT_SECRET ?? "selfhosted-dev-secret-change-in-production";

const RegisterBody = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().optional(),
});

const LoginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function signTempToken(userId: number): string {
  return jwt.sign({ userId, type: "2fa_pending" }, JWT_SECRET, { expiresIn: "5m" });
}

function userRow(user: typeof shUsersTable.$inferSelect) {
  return {
    id: String(user.id),
    email: user.email,
    name: user.name,
    role: user.role,
    twoFaEnabled: user.twoFaEnabled,
    createdAt: user.createdAt.toISOString(),
  };
}

router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", message: parsed.error.message });
    return;
  }
  const { email, password, name } = parsed.data;
  const existing = await db.select().from(shUsersTable).where(eq(shUsersTable.email, email));
  if (existing.length > 0) {
    res.status(409).json({ error: "Conflict", message: "Email already in use" });
    return;
  }
  const passwordHash = await bcrypt.hash(password, 12);
  const allUsers = await db.select().from(shUsersTable);
  const role = allUsers.length === 0 ? "admin" : "user";
  const [user] = await db.insert(shUsersTable).values({ email, passwordHash, name, role }).returning();
  const token = signToken({ userId: user.id, email: user.email, role: user.role });
  res.status(201).json({ token, user: userRow(user) });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", message: parsed.error.message });
    return;
  }
  const { email, password } = parsed.data;
  const [user] = await db.select().from(shUsersTable).where(eq(shUsersTable.email, email));
  if (!user) {
    res.status(401).json({ error: "Unauthorized", message: "Invalid credentials" });
    return;
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Unauthorized", message: "Invalid credentials" });
    return;
  }
  if (user.twoFaEnabled && user.twoFaSecret) {
    const tempToken = signTempToken(user.id);
    res.json({ requiresTwoFa: true, tempToken });
    return;
  }
  const token = signToken({ userId: user.id, email: user.email, role: user.role });
  res.json({ token, user: userRow(user) });
});

router.post("/auth/2fa/verify", async (req, res): Promise<void> => {
  const { tempToken, code } = req.body ?? {};
  if (!tempToken || !code) {
    res.status(400).json({ error: "tempToken and code are required" });
    return;
  }
  let payload: { userId: number; type: string };
  try {
    payload = jwt.verify(tempToken, JWT_SECRET) as { userId: number; type: string };
  } catch {
    res.status(401).json({ error: "Invalid or expired temp token" });
    return;
  }
  if (payload.type !== "2fa_pending") {
    res.status(401).json({ error: "Invalid token type" });
    return;
  }
  const [user] = await db.select().from(shUsersTable).where(eq(shUsersTable.id, payload.userId));
  if (!user || !user.twoFaSecret) {
    res.status(401).json({ error: "User not found" });
    return;
  }
  const totp = new OTPAuth.TOTP({ issuer: "NordSOCKS", label: user.email, algorithm: "SHA1", digits: 6, period: 30, secret: OTPAuth.Secret.fromBase32(user.twoFaSecret) });
  const delta = totp.validate({ token: String(code), window: 1 });
  if (delta === null) {
    res.status(401).json({ error: "Invalid 2FA code" });
    return;
  }
  const token = signToken({ userId: user.id, email: user.email, role: user.role });
  res.json({ token, user: userRow(user) });
});

router.get("/auth/me", authenticate, async (req, res): Promise<void> => {
  const [user] = await db.select().from(shUsersTable).where(eq(shUsersTable.id, req.user!.userId));
  if (!user) {
    res.status(401).json({ error: "Unauthorized", message: "User not found" });
    return;
  }
  res.json(userRow(user));
});

export default router;
