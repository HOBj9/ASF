/**
 * Environment Variables Validation
 * Validates and provides type-safe access to environment variables
 */

import { z } from "zod"

const envSchema = z.object({
  // Database
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  
  // NextAuth
  NEXTAUTH_SECRET: z.string().min(1, "NEXTAUTH_SECRET is required"),
  NEXTAUTH_URL: z.string().url("NEXTAUTH_URL must be a valid URL").optional(),
  
  // Application
  APP_NAME: z.string().optional(),
  APP_NAME_AR: z.string().optional(),
  APP_DESCRIPTION: z.string().optional(),
  APP_VERSION: z.string().optional(),
  
  // Default Users (optional)
  DEFAULT_ADMIN_NAME: z.string().optional(),
  DEFAULT_ADMIN_EMAIL: z.string().email().optional(),
  DEFAULT_ADMIN_PASSWORD: z.string().optional(),
  DEFAULT_USER_NAME: z.string().optional(),
  DEFAULT_USER_EMAIL: z.string().email().optional(),
  DEFAULT_USER_PASSWORD: z.string().optional(),
  
  // Features
  ENABLE_REGISTRATION: z.string().optional(),
  ENABLE_DARK_MODE: z.string().optional(),
  ENABLE_RTL: z.string().optional(),
  ENABLE_SEED_ENDPOINT: z.string().optional(),
  
  // Theme
  PRIMARY_COLOR: z.string().optional(),
  DEFAULT_THEME: z.enum(['light', 'dark', 'system']).optional(),
  
  // Pagination
  DEFAULT_PAGE_SIZE: z.string().optional(),
  MAX_PAGE_SIZE: z.string().optional(),
  
  // Database Config
  DB_MAX_POOL_SIZE: z.string().optional(),
  DB_SERVER_SELECTION_TIMEOUT: z.string().optional(),
  DB_SOCKET_TIMEOUT: z.string().optional(),
  DB_NAME: z.string().optional(),
  
  // Model Settings
  MIN_PASSWORD_LENGTH: z.string().optional(),
  REQUIRE_EMAIL_VERIFICATION: z.string().optional(),
  
  // Node Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
})

type EnvConfig = z.infer<typeof envSchema>

/**
 * Validate environment variables
 * Call this at application startup
 */
export function validateEnv(): EnvConfig {
  try {
    return envSchema.parse(process.env)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('\n')
      throw new Error(
        `❌ Invalid environment variables:\n${missingVars}\n\n` +
        `Please check your .env.local file and ensure all required variables are set.`
      )
    }
    throw error
  }
}

/**
 * Get validated environment variables
 * Use this instead of process.env directly
 */
let validatedEnv: EnvConfig | null = null

export function getEnv(): EnvConfig {
  if (!validatedEnv) {
    validatedEnv = validateEnv()
  }
  return validatedEnv
}

/**
 * Check if we're in development mode
 */
export function isDevelopment(): boolean {
  return getEnv().NODE_ENV === 'development'
}

/**
 * Check if we're in production mode
 */
export function isProduction(): boolean {
  return getEnv().NODE_ENV === 'production'
}

/**
 * Check if we're in test mode
 */
export function isTest(): boolean {
  return getEnv().NODE_ENV === 'test'
}

