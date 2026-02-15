const MALICIOUS_PATTERNS = [
  /javascript:/i,
  /data:/i,
  /base64,/i,
];

export function validateCreativeLink(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false;
    if (MALICIOUS_PATTERNS.some((pattern) => pattern.test(url))) return false;
    return true;
  } catch {
    return false;
  }
}
