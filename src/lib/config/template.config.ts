/**
 * Template Configuration
 * Metadata and customization points for the template
 */

export const templateConfig = {
  // Template metadata
  name: 'Next.js Admin Dashboard Template',
  version: '1.0.0',
  description: 'A reusable Next.js admin dashboard template with authentication, roles, and permissions',
  
  // Customization points
  customization: {
    // Branding
    appName: 'Admin Dashboard',
    appNameAr: 'لوحة التحكم',
    
    // Colors (can be customized in tailwind.config.ts)
    primaryColor: 'purple',
    
    // Features to enable/disable
    features: {
      registration: true,
      darkMode: true,
      rtl: true,
    },
  },
  
  // Files to customize
  filesToCustomize: [
    'src/lib/config/app.config.ts',
    'src/constants/messages.ts',
    'tailwind.config.ts',
    'package.json',
    'README.md',
  ],
  
  // Environment variables to set
  requiredEnvVars: [
    'MONGODB_URI',
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL',
  ],
  
  // Optional environment variables
  optionalEnvVars: [
    'APP_NAME',
    'APP_NAME_AR',
    'DEFAULT_ADMIN_EMAIL',
    'DEFAULT_ADMIN_PASSWORD',
    'DEFAULT_USER_EMAIL',
    'DEFAULT_USER_PASSWORD',
  ],
} as const;

export type TemplateConfig = typeof templateConfig;

