/**
 * Application Configuration
 * Centralized configuration for the application
 * Customize these values for your project
 */

export const appConfig = {
  // Application Metadata
  name: process.env.APP_NAME || 'لوحة التحكم',
  nameAr: process.env.APP_NAME_AR || 'لوحة التحكم',
  description: process.env.APP_DESCRIPTION || 'نظام إدارة شامل مع نظام المصادقة والأدوار والصلاحيات',
  version: process.env.APP_VERSION || '1.0.0',

  // Default Admin Credentials (change in production!)
  defaultAdmin: {
    name: process.env.DEFAULT_ADMIN_NAME || 'مدير النظام',
    email: process.env.DEFAULT_ADMIN_EMAIL || 'admin@example.com',
    password: process.env.DEFAULT_ADMIN_PASSWORD || 'admin123',
  },

  // Default User Credentials
  defaultUser: {
    name: process.env.DEFAULT_USER_NAME || 'مستخدم عادي',
    email: process.env.DEFAULT_USER_EMAIL || 'user@example.com',
    password: process.env.DEFAULT_USER_PASSWORD || 'user123',
  },

  // Feature Flags
  features: {
    registration: process.env.ENABLE_REGISTRATION !== 'false',
    darkMode: process.env.ENABLE_DARK_MODE !== 'false',
    rtl: process.env.ENABLE_RTL !== 'false',
    seedEndpoint: process.env.ENABLE_SEED_ENDPOINT !== 'false',
  },

  // Theme Configuration
  theme: {
    primaryColor: process.env.PRIMARY_COLOR || 'purple',
    defaultTheme: (process.env.DEFAULT_THEME || 'system') as 'light' | 'dark' | 'system',
  },

  // Pagination
  pagination: {
    defaultPageSize: parseInt(process.env.DEFAULT_PAGE_SIZE || '10'),
    maxPageSize: parseInt(process.env.MAX_PAGE_SIZE || '100'),
  },

  // Webhook Configuration
  webhook: {
    baseUrl: process.env.WEBHOOK_BASE_URL || 'https://77a541af2d3b.ngrok-free.app',
  },
} as const;

export type AppConfig = typeof appConfig;

