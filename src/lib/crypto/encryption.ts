/**
 * Application-level Envelope Encryption module (AES-256-GCM)
 * Provides zero-plaintext encrypted storage for recipes and sensitive culinary data.
 * Format: "enc:v1:<iv_base64>:<ciphertext_base64>:<tag_base64>"
 */

const ENCRYPTION_PREFIX = "enc:v1:";
const DEFAULT_KEY_SALT = "letscook_secure_salt_v1";

const derivedKeyCache = new Map<string, CryptoKey>();

async function deriveKey(customSecret?: string, iterations = 100000): Promise<CryptoKey> {
  const secret =
    customSecret ||
    (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_ENCRYPTION_KEY) ||
    "letscook_app_master_envelope_key_2026_secure";

  const cacheKey = `${secret}__iter_${iterations}`;
  if (derivedKeyCache.has(cacheKey)) {
    return derivedKeyCache.get(cacheKey)!;
  }

  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  const derived = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: encoder.encode(DEFAULT_KEY_SALT),
      iterations,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );

  derivedKeyCache.set(cacheKey, derived);
  return derived;
}

function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return typeof btoa !== "undefined"
    ? btoa(binary)
    : Buffer.from(binary, "binary").toString("base64");
}

function base64ToBuffer(base64Str: string): Uint8Array {
  try {
    // Sanitize base64 string for Safari WebKit
    let cleaned = base64Str.replace(/-/g, "+").replace(/_/g, "/").replace(/\s/g, "");
    while (cleaned.length % 4 !== 0) {
      cleaned += "=";
    }

    if (typeof atob !== "undefined") {
      const binary = atob(cleaned);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes;
    } else {
      return new Uint8Array(Buffer.from(cleaned, "base64"));
    }
  } catch (err) {
    console.warn("base64ToBuffer fallback:", err);
    return new Uint8Array();
  }
}

export function isEncrypted(value?: string | null): boolean {
  if (!value || typeof value !== "string") return false;
  return value.startsWith(ENCRYPTION_PREFIX);
}

export async function encryptText(
  plainText?: string | null,
  customKey?: string
): Promise<string> {
  if (!plainText || typeof plainText !== "string") {
    return plainText ?? "";
  }

  if (isEncrypted(plainText)) {
    return plainText;
  }

  try {
    const key = await deriveKey(customKey, 100000);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encodedData = new TextEncoder().encode(plainText);

    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: iv as BufferSource,
        tagLength: 128,
      },
      key,
      encodedData as BufferSource
    );

    const encryptedBytes = new Uint8Array(encryptedBuffer);
    const ciphertext = encryptedBytes.slice(0, encryptedBytes.length - 16);
    const authTag = encryptedBytes.slice(encryptedBytes.length - 16);

    const ivB64 = bufferToBase64(iv);
    const cipherB64 = bufferToBase64(ciphertext);
    const tagB64 = bufferToBase64(authTag);

    return `${ENCRYPTION_PREFIX}${ivB64}:${cipherB64}:${tagB64}`;
  } catch (error) {
    console.error("[Encryption] Failed to encrypt:", error);
    return plainText;
  }
}

export async function decryptText(
  cipherText?: string | null,
  customKey?: string
): Promise<string> {
  if (!cipherText || typeof cipherText !== "string") {
    return cipherText ?? "";
  }

  if (!isEncrypted(cipherText)) {
    return cipherText;
  }

  try {
    const payload = cipherText.slice(ENCRYPTION_PREFIX.length);
    const parts = payload.split(":");
    if (parts.length !== 3) {
      return cipherText;
    }

    const [ivB64, cipherB64, tagB64] = parts;
    const iv = base64ToBuffer(ivB64);
    const ciphertext = base64ToBuffer(cipherB64);
    const authTag = base64ToBuffer(tagB64);

    if (iv.length === 0 || ciphertext.length === 0 || authTag.length === 0) {
      return cipherText;
    }

    const fullCipherBuffer = new Uint8Array(ciphertext.length + authTag.length);
    fullCipherBuffer.set(ciphertext, 0);
    fullCipherBuffer.set(authTag, ciphertext.length);

    // Try primary 100k iterations, then 10k iterations
    const iterationTries = [100000, 10000];

    for (const iters of iterationTries) {
      try {
        const key = await deriveKey(customKey, iters);
        const decryptedBuffer = await crypto.subtle.decrypt(
          {
            name: "AES-GCM",
            iv: iv as BufferSource,
            tagLength: 128,
          },
          key,
          fullCipherBuffer as BufferSource
        );

        return new TextDecoder().decode(decryptedBuffer);
      } catch {
        // Continue to fallback
      }
    }

    return cipherText;
  } catch (error) {
    console.error("[Encryption] Failed to decrypt:", error);
    return cipherText;
  }
}
