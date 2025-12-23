/**
 * Session Error Detector Utility
 * Detects if an error is related to session issues (disconnected, terminated, not found, etc.)
 */

/**
 * Check if an error is related to session issues
 * @param error - The error object or error message
 * @returns true if the error is session-related, false otherwise
 */
export function isSessionRelatedError(error: any): boolean {
  if (!error) return false;

  // Get error message as string
  const errorMessage = typeof error === 'string' 
    ? error.toLowerCase() 
    : (error.message || error.error || String(error)).toLowerCase();

  // Session-related error patterns
  const sessionErrorPatterns = [
    'session not found',
    'session disconnected',
    'session terminated',
    'session expired',
    'session invalid',
    'session not connected',
    'session not ready',
    'session not active',
    'connection error',
    'connection failed',
    'connection refused',
    'connection timeout',
    'network error',
    'client not found',
    'client disconnected',
    'client not connected',
    'whatsapp api',
    'unable to connect',
    'failed to connect',
    'socket',
    'websocket',
    'qr code',
    'authentication failed',
    'session expired',
  ];

  // Check if error message contains any session-related pattern
  return sessionErrorPatterns.some(pattern => errorMessage.includes(pattern));
}

