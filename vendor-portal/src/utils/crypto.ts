// Used only by the mock auth service so it never keeps plain-text passwords in localStorage.
// The real backend hashes with bcrypt server-side; the frontend just sends the password over HTTPS.

export async function sha256(text: string): Promise<string> {
  if (globalThis.crypto?.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  // Fallback for non-secure contexts (e.g. LAN IP over http): FNV-1a. Mock use only.
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `fnv-${(h >>> 0).toString(16)}`;
}

export function randomId(prefix = ''): string {
  const rnd = globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
  return `${prefix}${rnd.replace(/-/g, '').slice(0, 12)}`;
}
