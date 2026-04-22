import { Router, type IRouter } from "express";
import bcrypt from "bcrypt";
import * as OTPAuth from "otpauth";
import QRCode from "qrcode";
import { db, shUsersTable } from "../db";
import { eq } from "drizzle-orm";
import { authenticate } from "../middlewares/auth";
import { z } from "zod";

const router: IRouter = Router();

const ChangeEmailBody = z.object({
  newEmail: z.string().email(),
  currentPassword: z.string().min(1),
});

const ChangePasswordBody = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

const Enable2FABody = z.object({
  code: z.string().length(6),
});

const Disable2FABody = z.object({
  currentPassword: z.string().min(1),
});

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

router.get("/account", authenticate, async (req, res): Promise<void> => {
  const [user] = await db.select().from(shUsersTable).where(eq(shUsersTable.id, req.user!.userId));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json(userRow(user));
});

router.put("/account/name", authenticate, async (req, res): Promise<void> => {
  const { name } = req.body as { name: string };
  if (!name || typeof name !== "string") { res.status(400).json({ error: "Name is required" }); return; }
  const [updated] = await db.update(shUsersTable).set({ name }).where(eq(shUsersTable.id, req.user!.userId)).returning();
  res.json(userRow(updated));
});

router.put("/account/email", authenticate, async (req, res): Promise<void> => {
  const parsed = ChangeEmailBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [user] = await db.select().from(shUsersTable).where(eq(shUsersTable.id, req.user!.userId));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  const valid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!valid) { res.status(401).json({ error: "Invalid current password" }); return; }
  const existing = await db.select().from(shUsersTable).where(eq(shUsersTable.email, parsed.data.newEmail));
  if (existing.length > 0 && existing[0].id !== user.id) {
    res.status(409).json({ error: "Email already in use" }); return;
  }
  const [updated] = await db.update(shUsersTable).set({ email: parsed.data.newEmail }).where(eq(shUsersTable.id, user.id)).returning();
  res.json(userRow(updated));
});

router.put("/account/password", authenticate, async (req, res): Promise<void> => {
  const parsed = ChangePasswordBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [user] = await db.select().from(shUsersTable).where(eq(shUsersTable.id, req.user!.userId));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  const valid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!valid) { res.status(401).json({ error: "Invalid current password" }); return; }
  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
  await db.update(shUsersTable).set({ passwordHash }).where(eq(shUsersTable.id, user.id));
  res.json({ success: true });
});

router.post("/account/2fa/setup", authenticate, async (req, res): Promise<void> => {
  const [user] = await db.select().from(shUsersTable).where(eq(shUsersTable.id, req.user!.userId));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  if (user.twoFaEnabled) { res.status(400).json({ error: "2FA is already enabled" }); return; }
  const secretObj = new OTPAuth.Secret({ size: 20 });
  const secret = secretObj.base32;
  await db.update(shUsersTable).set({ twoFaSecret: secret }).where(eq(shUsersTable.id, user.id));
  const totp = new OTPAuth.TOTP({ issuer: "NordSOCKS Self-Hosted", label: user.email, algorithm: "SHA1", digits: 6, period: 30, secret: secretObj });
  const otpauthUrl = totp.toString();
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
  res.json({ secret, qrCode: qrCodeDataUrl });
});

router.post("/account/2fa/enable", authenticate, async (req, res): Promise<void> => {
  const parsed = Enable2FABody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "6-digit code required" }); return; }
  const [user] = await db.select().from(shUsersTable).where(eq(shUsersTable.id, req.user!.userId));
  if (!user || !user.twoFaSecret) { res.status(400).json({ error: "2FA setup not initiated" }); return; }
  const totp = new OTPAuth.TOTP({ issuer: "NordSOCKS Self-Hosted", label: user.email, algorithm: "SHA1", digits: 6, period: 30, secret: OTPAuth.Secret.fromBase32(user.twoFaSecret) });
  const delta = totp.validate({ token: parsed.data.code, window: 1 });
  if (delta === null) { res.status(401).json({ error: "Invalid 2FA code" }); return; }
  await db.update(shUsersTable).set({ twoFaEnabled: true }).where(eq(shUsersTable.id, user.id));
  res.json({ success: true });
});

router.post("/account/2fa/disable", authenticate, async (req, res): Promise<void> => {
  const parsed = Disable2FABody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [user] = await db.select().from(shUsersTable).where(eq(shUsersTable.id, req.user!.userId));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  const valid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!valid) { res.status(401).json({ error: "Invalid password" }); return; }
  await db.update(shUsersTable).set({ twoFaEnabled: false, twoFaSecret: null }).where(eq(shUsersTable.id, user.id));
  res.json({ success: true });
});

export default router;
