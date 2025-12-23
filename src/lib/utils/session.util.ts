/**
 * Session Utilities
 * Helper functions for session management
 */

import Session from '@/models/Session';

/**
 * Generate a unique session name
 * Format: username + 4 random digits
 * 
 * @param username - The username to use as base
 * @param maxRetries - Maximum number of retries if name exists (default: 10)
 * @returns A unique session name
 */
export async function generateUniqueSessionName(
  username: string,
  maxRetries: number = 10
): Promise<string> {
  // Clean username (remove spaces, special chars, etc.)
  const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  
  if (!cleanUsername) {
    throw new Error('اسم المستخدم غير صالح');
  }

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    // Generate 4 random digits
    const randomDigits = Math.floor(1000 + Math.random() * 9000).toString();
    const sessionName = `${cleanUsername}${randomDigits}`;

    // Check if session name already exists
    const existingSession = await Session.findOne({ sessionName });
    
    if (!existingSession) {
      return sessionName;
    }
  }

  // If we've exhausted retries, throw an error
  throw new Error('فشل في إنشاء اسم جلسة فريد. يرجى المحاولة مرة أخرى.');
}

