# Template Customization Guide

This is a reusable Next.js admin dashboard template. Follow this guide to customize it for your project.

## Quick Start

1. **Clone or copy this template**
2. **Install dependencies**: `npm install`
3. **Configure environment variables** (see below)
4. **Customize configuration files** (see below)
5. **Run the seed script**: `npm run seed`
6. **Start development**: `npm run dev`

## Configuration

### 1. Environment Variables

Create a `.env.local` file with the following variables:

```env
# Required
MONGODB_URI=mongodb://localhost:27017/your-database-name
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:3000

# Optional - Customize default values
APP_NAME=Your App Name
APP_NAME_AR=اسم التطبيق
DEFAULT_ADMIN_EMAIL=admin@yourdomain.com
DEFAULT_ADMIN_PASSWORD=your-secure-password
DEFAULT_USER_EMAIL=user@yourdomain.com
DEFAULT_USER_PASSWORD=user-password
```

### 2. Application Configuration

Edit `src/lib/config/app.config.ts` to customize:
- App name and description
- Default admin/user credentials
- Feature flags (registration, dark mode, RTL)
- Theme configuration
- Pagination settings

### 3. Database Configuration

Edit `src/lib/config/db.config.ts` to customize:
- MongoDB connection settings
- Connection pool size
- Model-specific settings

### 4. Authentication Configuration

Edit `src/lib/config/auth.config.ts` to customize:
- Session settings
- Provider configuration
- Callback settings

### 5. Messages and Text

Edit `src/constants/messages.ts` to customize all text content:
- Authentication messages
- User management messages
- Role and permission messages
- Error messages
- Success messages

### 6. Routes

Edit `src/constants/routes.ts` to customize:
- Public routes
- Protected routes
- Admin routes
- API routes

### 7. Permissions

Edit `src/constants/permissions.ts` to customize:
- Permission resources
- Permission actions
- Default permissions
- Default roles

### 8. Styling

Edit `tailwind.config.ts` to customize:
- Colors
- Fonts
- Spacing
- Theme variables

## Customization Checklist

- [ ] Update `.env.local` with your values
- [ ] Customize `src/lib/config/app.config.ts`
- [ ] Update `src/constants/messages.ts` with your text
- [ ] Modify `src/constants/routes.ts` if needed
- [ ] Adjust `src/constants/permissions.ts` for your needs
- [ ] Update `tailwind.config.ts` for your brand colors
- [ ] Change `package.json` name and description
- [ ] Update `README.md` with your project information
- [ ] Replace logo and favicon in `public/` folder
- [ ] Customize components in `src/components/` as needed

## Adding New Features

### Adding a New Service

1. Create a service file in `src/lib/services/`
2. Implement business logic
3. Use the service in API routes

### Adding a New Model

1. Create a model file in `src/models/`
2. Register it in `src/models/index.ts`
3. Create a service for it
4. Add API routes if needed

### Adding a New Permission

1. Add to `src/constants/permissions.ts`
2. Update seed data if needed
3. Use in permission checks

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── dashboard/         # Dashboard pages
│   └── ...
├── components/            # React components
├── lib/                   # Core libraries
│   ├── config/           # Configuration files
│   ├── services/          # Business logic services
│   └── utils/             # Utility functions
├── constants/             # Application constants
├── models/                # Database models
└── types/                 # TypeScript types
```

## Best Practices

1. **Keep configuration centralized**: Use config files instead of hardcoding values
2. **Use services for business logic**: Don't put business logic directly in API routes
3. **Use constants for messages**: Makes i18n easier in the future
4. **Follow the existing patterns**: Maintain consistency with the template structure
5. **Test your changes**: Make sure everything works after customization

## Support

For issues or questions, please refer to the main README.md or create an issue in the repository.

