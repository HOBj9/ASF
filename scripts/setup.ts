/**
 * Setup Script
 * Interactive setup wizard for initializing the template
 */

import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

async function setup() {
  console.log('🚀 Welcome to the Next.js Admin Dashboard Template Setup!\n');

  // App Information
  const appName = await question('App Name (default: Admin Dashboard): ') || 'Admin Dashboard';
  const appNameAr = await question('App Name (Arabic) (default: لوحة التحكم): ') || 'لوحة التحكم';
  const appDescription = await question('App Description: ') || '';

  // Database Configuration
  console.log('\n📦 Database Configuration:');
  const dbUri = await question('MongoDB URI (default: mongodb://localhost:27017/admin-dashboard): ') || 
    'mongodb://localhost:27017/admin-dashboard';

  // Authentication Configuration
  console.log('\n🔐 Authentication Configuration:');
  const nextAuthSecret = await question('NextAuth Secret (leave empty to generate): ') || 
    generateSecret();
  const nextAuthUrl = await question('NextAuth URL (default: http://localhost:3000): ') || 
    'http://localhost:3000';

  // Default Admin
  console.log('\n👤 Default Admin Account:');
  const adminEmail = await question('Admin Email (default: admin@example.com): ') || 
    'admin@example.com';
  const adminPassword = await question('Admin Password (default: admin123): ') || 
    'admin123';
  const adminName = await question('Admin Name (default: مدير النظام): ') || 
    'مدير النظام';

  // Default User
  console.log('\n👥 Default User Account:');
  const userEmail = await question('User Email (default: user@example.com): ') || 
    'user@example.com';
  const userPassword = await question('User Password (default: user123): ') || 
    'user123';
  const userName = await question('User Name (default: مستخدم عادي): ') || 
    'مستخدم عادي';

  // Features
  console.log('\n⚙️  Features:');
  const enableRegistration = await question('Enable Registration? (y/n, default: y): ') || 'y';
  const enableDarkMode = await question('Enable Dark Mode? (y/n, default: y): ') || 'y';
  const enableRTL = await question('Enable RTL? (y/n, default: y): ') || 'y';

  // Generate .env.local
  const envContent = `# Application Configuration
APP_NAME=${appName}
APP_NAME_AR=${appNameAr}
APP_DESCRIPTION=${appDescription}

# Database
MONGODB_URI=${dbUri}

# Authentication
NEXTAUTH_SECRET=${nextAuthSecret}
NEXTAUTH_URL=${nextAuthUrl}

# Default Admin
DEFAULT_ADMIN_NAME=${adminName}
DEFAULT_ADMIN_EMAIL=${adminEmail}
DEFAULT_ADMIN_PASSWORD=${adminPassword}

# Default User
DEFAULT_USER_NAME=${userName}
DEFAULT_USER_EMAIL=${userEmail}
DEFAULT_USER_PASSWORD=${userPassword}

# Features
ENABLE_REGISTRATION=${enableRegistration === 'y' ? 'true' : 'false'}
ENABLE_DARK_MODE=${enableDarkMode === 'y' ? 'true' : 'false'}
ENABLE_RTL=${enableRTL === 'y' ? 'true' : 'false'}
`;

  // Write .env.local
  const envPath = path.join(process.cwd(), '.env.local');
  fs.writeFileSync(envPath, envContent);

  console.log('\n✅ Configuration saved to .env.local');
  console.log('\n📝 Next Steps:');
  console.log('1. Review .env.local and adjust if needed');
  console.log('2. Run: npm install');
  console.log('3. Run: npm run seed');
  console.log('4. Run: npm run dev');
  console.log('\n🎉 Setup complete!');

  rl.close();
}

function generateSecret(): string {
  return require('crypto').randomBytes(32).toString('hex');
}

setup().catch((error) => {
  console.error('Setup error:', error);
  rl.close();
  process.exit(1);
});

