/**
 * Authentication Configuration
 * NextAuth.js and authentication settings
 */

export const authConfig = {
  // NextAuth Configuration
  secret: process.env.NEXTAUTH_SECRET || 'change-this-secret-in-production',
  url: process.env.NEXTAUTH_URL || 'http://localhost:3000',

  // Session Configuration
  session: {
    strategy: 'jwt' as const,
    maxAge: parseInt(process.env.SESSION_MAX_AGE || '30') * 24 * 60 * 60, // days to seconds
    updateAge: parseInt(process.env.SESSION_UPDATE_AGE || '24') * 60 * 60, // hours to seconds
  },

  // Pages Configuration
  pages: {
    signIn: '/login',
    signOut: '/login',
    error: '/login',
    newUser: '/register',
  },

  // Provider Settings
  providers: {
    credentials: {
      name: 'Credentials',
      enabled: true,
    },
  },

  // Callbacks Configuration
  callbacks: {
    // JWT callback settings
    jwt: {
      includeRole: true,
      includePermissions: true,
    },
    // Session callback settings
    session: {
      includeUser: true,
      includeRole: true,
    },
  },
} as const;

export type AuthConfig = typeof authConfig;

