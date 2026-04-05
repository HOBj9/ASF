import { createHash, randomBytes } from 'crypto';

export function generateTrackingToken(): string {
  return randomBytes(32).toString('hex');
}

export function hashTrackingToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
