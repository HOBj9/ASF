/**
 * Database Configuration
 * MongoDB connection and model settings
 */

export const dbConfig = {
  // MongoDB Connection
  uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/waste-management-system',
  
  // Connection Options
  options: {
    maxPoolSize: parseInt(process.env.DB_MAX_POOL_SIZE || '25'),
    serverSelectionTimeoutMS: parseInt(process.env.DB_SERVER_SELECTION_TIMEOUT || '5000'),
    socketTimeoutMS: parseInt(process.env.DB_SOCKET_TIMEOUT || '45000'),
  },

  // Database Name (extracted from URI if not provided)
  databaseName: process.env.DB_NAME || 'waste-management-system',

  // Model Settings
  models: {
    // User Model
    user: {
      minPasswordLength: parseInt(process.env.MIN_PASSWORD_LENGTH || '6'),
      requireEmailVerification: process.env.REQUIRE_EMAIL_VERIFICATION === 'true',
    },
  },
} as const;

export type DbConfig = typeof dbConfig;

