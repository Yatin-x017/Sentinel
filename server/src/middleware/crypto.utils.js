import crypto from 'crypto';

export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

export function hmacHash(value, secret) {
  return crypto.createHmac('sha256', secret).update(value).digest('hex');
}

export function generateOtp() {
  return crypto.randomInt(100000, 999999).toString();
}

export function generateSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}