import { describe, it, expect } from "vitest";
import { encryptText, decryptText, isEncrypted } from "../encryption";

describe("AES-256-GCM Envelope Encryption", () => {
  it("should successfully encrypt and decrypt a recipe title", async () => {
    const plainText = "Porc haché, riz & navet glacé à la japonaise";
    const encrypted = await encryptText(plainText);

    expect(encrypted).not.toBe(plainText);
    expect(isEncrypted(encrypted)).toBe(true);
    expect(encrypted.startsWith("enc:v1:")).toBe(true);

    const decrypted = await decryptText(encrypted);
    expect(decrypted).toBe(plainText);
  });

  it("should encrypt and decrypt complex JSON payloads (ingredients and steps)", async () => {
    const payload = JSON.stringify([
      { id: "ing-1", name: "Navet", amount: 4, unit: "pièce(s)" },
      { id: "ing-2", name: "Carotte", amount: 3, unit: "pièce(s)" },
    ]);

    const encrypted = await encryptText(payload);
    expect(isEncrypted(encrypted)).toBe(true);

    const decrypted = await decryptText(encrypted);
    const parsed = JSON.parse(decrypted);

    expect(parsed).toHaveLength(2);
    expect(parsed[0].name).toBe("Navet");
    expect(parsed[1].amount).toBe(3);
  });

  it("should return identical output when decrypting unencrypted text", async () => {
    const plain = "Simple plain text";
    const decrypted = await decryptText(plain);
    expect(decrypted).toBe(plain);
  });

  it("should handle empty or null values gracefully", async () => {
    expect(await encryptText("")).toBe("");
    expect(await decryptText("")).toBe("");
  });
});
