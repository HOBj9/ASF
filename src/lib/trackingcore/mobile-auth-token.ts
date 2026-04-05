import { createHmac, timingSafeEqual } from 'crypto';

export interface MobileAuthTokenPayload {
  sub: string;
  email: string;
  name: string;
  role: string;
  organizationId?: string | null;
  branchId?: string | null;
  trackingVehicleId?: string | null;
  iat: number;
  exp: number;
}

const DEFAULT_MOBILE_AUTH_EXPIRES_IN_SECONDS = 60 * 60 * 24;

function getMobileAuthSecret(): string {
  const secret =
    process.env.MOBILE_TRACKING_AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.AUTH_SECRET ||
    '';

  if (!secret) {
    const error: any = new Error('MOBILE_TRACKING_AUTH_SECRET is not configured');
    error.status = 500;
    throw error;
  }

  return secret;
}

function toBase64Url(value: string | Buffer): string {
  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function fromBase64Url(value: string): Buffer {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  return Buffer.from(`${normalized}${padding}`, 'base64');
}

function signValue(value: string): string {
  const secret = getMobileAuthSecret();
  return toBase64Url(createHmac('sha256', secret).update(value).digest());
}

export function createMobileAuthToken(
  payload: Omit<MobileAuthTokenPayload, 'iat' | 'exp'>,
  expiresInSeconds = DEFAULT_MOBILE_AUTH_EXPIRES_IN_SECONDS
) {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: MobileAuthTokenPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const encodedPayload = toBase64Url(JSON.stringify(fullPayload));
  const signature = signValue(encodedPayload);

  return {
    token: `${encodedPayload}.${signature}`,
    payload: fullPayload,
  };
}

export function verifyMobileAuthToken(token: string): MobileAuthTokenPayload {
  const normalizedToken = String(token || '').trim();
  if (!normalizedToken) {
    const error: any = new Error('Mobile login token is missing');
    error.status = 401;
    throw error;
  }

  const [encodedPayload, encodedSignature] = normalizedToken.split('.');
  if (!encodedPayload || !encodedSignature) {
    const error: any = new Error('Invalid mobile login token');
    error.status = 401;
    throw error;
  }

  const expectedSignature = signValue(encodedPayload);
  const actualBuffer = Buffer.from(encodedSignature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    const error: any = new Error('Invalid mobile login token');
    error.status = 401;
    throw error;
  }

  const payload = JSON.parse(fromBase64Url(encodedPayload).toString('utf8')) as MobileAuthTokenPayload;
  const now = Math.floor(Date.now() / 1000);

  if (!payload?.sub || !payload?.email || !payload?.role || !payload?.exp) {
    const error: any = new Error('Invalid mobile login token');
    error.status = 401;
    throw error;
  }

  if (payload.exp <= now) {
    const error: any = new Error('Mobile login token has expired');
    error.status = 401;
    throw error;
  }

  return payload;
}
