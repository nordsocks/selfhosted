import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const ALGORITHM = "aes-256-gcm";
const ENCRYPTION_KEY = process.env.SELFHOSTED_ENCRYPTION_KEY ?? process.env.ENCRYPTION_KEY ?? "selfhosted-dev-key-change-in-production!";
const key = scryptSync(ENCRYPTION_KEY, "salt-nordvpn-selfhosted", 32);

export function encrypt(text: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decrypt(encryptedText: string): string {
  const parts = encryptedText.split(":");
  if (parts.length !== 3) throw new Error("Invalid encrypted text format");
  const [ivHex, authTagHex, encryptedHex] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const encryptedBuffer = Buffer.from(encryptedHex, "hex");
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(encryptedBuffer).toString("utf8") + decipher.final("utf8");
}
