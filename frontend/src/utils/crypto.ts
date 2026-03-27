/**
 * Computes a SHA-256 hash of a plaintext string using the browser's SubtleCrypto API.
 * Returns a 32-byte Uint8Array — exactly what the Vault contract expects.
 */
export async function sha256Browser(text: string): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return new Uint8Array(hashBuffer);
}

/** Converts a Uint8Array to a lowercase hex string for display. */
export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
