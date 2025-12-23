/**
 * Application Routes
 * Centralized route definitions
 */

export const routes = {
  // Public Routes
  public: {
    home: '/',
    login: '/login',
    register: '/register',
  },

  // Protected Routes
  protected: {
    dashboard: '/dashboard',
    settings: '/dashboard/settings',
    profile: '/dashboard/profile',
    unauthorized: '/unauthorized',
  },

  // Admin Routes
  admin: {
    users: '/dashboard/admin/users',
    roles: '/dashboard/admin/roles',
    permissions: '/dashboard/admin/permissions',
  },

  // API Routes
  api: {
    auth: {
      login: '/api/auth/signin',
      logout: '/api/auth/signout',
      session: '/api/auth/session',
      register: '/api/auth/register',
    },
    admin: {
      users: '/api/admin/users',
      user: (id: string) => `/api/admin/users/${id}`,
      roles: '/api/admin/roles',
      role: (id: string) => `/api/admin/roles/${id}`,
      permissions: '/api/admin/permissions',
      permission: (id: string) => `/api/admin/permissions/${id}`,
    },
    profile: '/api/profile',
    seed: '/api/seed',
  },
} as const;

export type Routes = typeof routes;

