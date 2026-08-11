/**
 * Basic sanitization helpers to avoid leaking secrets.
 */

const SECRET_PATTERNS = [
  /(?:api[_-]?key|apikey|secret|token|password|passwd|pwd|auth)\s*[:=]\s*['"]?[^\s'"]{8,}/gi,
  /sk-[a-zA-Z0-9]{20,}/g,
  /ghp_[a-zA-Z0-9]{30,}/g,
  /xox[baprs]-[a-zA-Z0-9-]{10,}/g
];

export function redactSecrets(text: string): string {
  let result = text;
  for (const re of SECRET_PATTERNS) {
    result = result.replace(re, '[REDACTED]');
  }
  return result;
}

export function isLikelySecretContent(text: string): boolean {
  return SECRET_PATTERNS.some(re => {
    re.lastIndex = 0;
    return re.test(text);
  });
}
