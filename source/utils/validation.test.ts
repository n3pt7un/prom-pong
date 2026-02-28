import { describe, it, expect } from '@jest/globals';

// Copy of the helper (to test in isolation — keep in sync with routes)
function isValidAvatarUrl(url: string): boolean {
  if (!url) return true;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

describe('isValidAvatarUrl', () => {
  it('accepts https URLs', () => expect(isValidAvatarUrl('https://example.com/avatar.png')).toBe(true));
  it('accepts http URLs', () => expect(isValidAvatarUrl('http://example.com/avatar.png')).toBe(true));
  it('rejects javascript: URIs', () => expect(isValidAvatarUrl('javascript:alert(1)')).toBe(false));
  it('rejects data: URIs', () => expect(isValidAvatarUrl('data:text/html,<h1>hi</h1>')).toBe(false));
  it('rejects plain strings', () => expect(isValidAvatarUrl('not-a-url')).toBe(false));
  it('accepts empty string', () => expect(isValidAvatarUrl('')).toBe(true));
});
