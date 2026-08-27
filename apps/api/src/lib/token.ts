
export function generateAccessToken(lengthBytes = 32): string {
  const buffer = new Uint8Array(lengthBytes);
  crypto.getRandomValues(buffer);
  return Array.from(buffer, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
