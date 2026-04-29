# Next.js Starter Kit

A production-ready Next.js starter kit with authentication, roles, and permissions. Built with Next.js 14, MongoDB, TypeScript, and Tailwind CSS.

**قالب Next.js جاهز للاستخدام مع نظام المصادقة والأدوار والصلاحيات**

## Features

- ✅ Complete authentication system (login and registration)
- ✅ Advanced roles and permissions system
- ✅ Arabic RTL UI using shadcn/ui
- ✅ Route protection using Middleware
- ✅ User management for admins
- ✅ Docker support for easy deployment
- ✅ Clean and organized codebase

## Tech Stack

- **Next.js 14** - React Framework
- **TypeScript** - Type Safety
- **MongoDB** - Database
- **NextAuth.js** - Authentication
- **shadcn/ui** - UI Components
- **Tailwind CSS** - Styling
- **Docker** - Containerization

## Installation & Setup

### Using Docker (Recommended)

1. Clone the repository:
```bash
git clone <repository-url>
cd web-system
```

2. Create a `.env.local` file (optional, defaults are set in docker-compose.yml):
```env
MONGODB_URI=mongodb://admin:admin123@mongodb:27017/rapido-go?authSource=admin
NEXTAUTH_URL=http://localhost:3020
NEXTAUTH_SECRET=your-secret-key-change-in-production
```

3. Run the project using Docker Compose:

**For development (with hot reload):**
```bash
docker-compose up
```

**For production:**
```bash
docker-compose -f docker-compose.prod.yml up -d
```

4. Run the seed script to create default users:
```bash
docker-compose exec app npm run seed
```

5. Open your browser at `http://localhost:3020`

**Note:** In development mode, Docker will automatically watch for changes and reload the application.

### Without Docker

1. Install dependencies:
```bash
npm install
```

2. Set up MongoDB locally or use MongoDB Atlas

3. Create a `.env.local` file:
```env
MONGODB_URI=mongodb://localhost:27017/rapido-go
NEXTAUTH_URL=http://localhost:3020
NEXTAUTH_SECRET=your-secret-key-change-in-production
```

4. Run the seed script:
```bash
npm run seed
```

5. Run the development server:
```bash
npm run dev
```

## Default Accounts

After running the seed script, you can log in using:

### Admin User
- **Email:** admin@example.com
- **Password:** admin123

### Regular User
- **Email:** user@example.com
- **Password:** user123

## Project Structure

```
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   │   ├── auth/         # Authentication endpoints
│   │   ├── admin/        # Admin management endpoints
│   │   └── profile/      # User profile endpoints
│   ├── dashboard/         # Dashboard pages
│   │   ├── admin/        # Admin pages (users, roles)
│   │   ├── profile/      # User profile page
│   │   └── settings/    # Settings page
│   ├── login/             # Login page
│   └── register/          # Registration page
├── components/            # React Components
│   ├── ui/                # shadcn/ui components
│   ├── admin/             # Admin components
│   ├── dashboard/         # Dashboard components
│   └── landing/           # Landing page components
├── lib/                   # Utilities and services
│   ├── auth.ts           # NextAuth configuration
│   ├── permissions.ts    # Permission utilities
│   └── services/         # Business logic services
├── models/                # MongoDB Models
│   ├── User.ts           # User model
│   ├── Role.ts           # Role model
│   └── Permission.ts     # Permission model
├── middleware.ts          # Next.js Middleware
└── scripts/               # Scripts
    └── seed.ts           # Database seeding script
```

## Roles and Permissions

The system supports a flexible roles and permissions system:

- **Admin (مدير):** Full system permissions
- **User (مستخدم):** Limited permissions

You can customize permissions for each role as needed. The system includes permissions for:
- Users management (create, read, update, delete)
- Roles management (create, read, update, delete)
- Permissions management (create, read, update, delete)

## Development

```bash
# Run in development mode
npm run dev

# Build for production
npm run build

# Run production build
npm start
```

## Docker Configuration

- **Port:** 3020
- **Database:** rapido-go
- **MongoDB Port:** 27017 (localhost only in dev mode)

## Security

- Passwords are hashed using bcrypt
- Route protection using NextAuth Middleware
- Permission checks at API route level
- CSRF protection built into NextAuth

## License

MIT
test
