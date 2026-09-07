import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const VERSION = "v1";
const IV_LENGTH = 12;

function getEncryptionKey() {
  const configuredKey =
    process.env.OKADO_REDEMPTION_PIN_ENCRYPTION_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    (process.env.NODE_ENV === "production" ? undefined : "okado-local-memory-pin-key");

  if (!configuredKey) {
    throw new Error("La clé de chiffrement du PIN marchand n'est pas configurée.");
  }

  // A dedicated key is preferred. The service-role fallback keeps existing
  // deployments compatible until that dedicated secret is provisioned.
  return createHash("sha256").update(configuredKey).digest();
}

export function encryptRedemptionPin(pin: string) {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(pin, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [VERSION, iv.toString("hex"), authTag.toString("hex"), encrypted.toString("hex")].join(":");
}

export function decryptRedemptionPin(value: string | null | undefined) {
  if (!value) return null;

  const [version, ivHex, authTagHex, encryptedHex] = value.split(":");
  if (version !== VERSION || !ivHex || !authTagHex || !encryptedHex) return null;

  try {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      getEncryptionKey(),
      Buffer.from(ivHex, "hex"),
    );
    decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedHex, "hex")),
      decipher.final(),
    ]).toString("utf8");

    return /^\d{4}$/.test(decrypted) ? decrypted : null;
  } catch {
    return null;
  }
}
