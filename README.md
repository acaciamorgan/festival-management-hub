# Festival Management System

A comprehensive, modular film festival management platform built with Next.js, TypeScript, Tailwind CSS, and Supabase.

## Features

### Core Architecture
- **Pluggable Module System**: Add new modules without touching core architecture
- **Role-Based Permissions**: Granular read/edit permissions per module per user
- **Environment Separation**: Clear dev/prod separation with visual indicators
- **Responsive Design**: Built with Tailwind CSS for all screen sizes

### Core Cards (Data Types)
- **Titles**: Film information and metadata
- **Venues**: Screening locations and logistics
- **Guests**: Industry professionals and talent
- **Press**: Media contacts and credentials
- **Programs**: Festival programs not tied to specific films

### Modules (12 Initial Modules)
1. **Titles** - Film management and display
2. **Press Screenings** - Media screening coordination
3. **Screener Access** - Digital screening permissions
4. **Photo Shoots** - Photography session management
5. **In Attendance** - Guest travel and accommodation
6. **Interview Management** - Media interview scheduling
7. **Red Carpets** - Premium event coordination
8. **Special Events** - Festival activities (Grid + Calendar views)
9. **Venue Management** - Location logistics
10. **Press Management** - Media relations
11. **Reports & Analytics** - Data insights and exports
12. **Admin** - User and permission management

### Key Features
- **Template Grid System**: Resizable columns, advanced sorting (ignores articles/special chars)
- **RSVP System**: Tokenized external forms that integrate with existing Cards
- **Authentication**: Supabase Auth with middleware protection
- **Smart Sorting**: Alphabetical sorting that ignores "The", "A", "An" and special characters

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Row Level Security)
- **Deployment**: Vercel
- **State Management**: React Context + Supabase real-time subscriptions

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd festival-management
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NODE_ENV=development
NEXT_PUBLIC_APP_ENV=development
NEXT_PUBLIC_SHOW_DEV_BANNER=true
```

4. Set up your Supabase database (schemas to be defined per Card type)

5. Start the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## Environment Management

### Development vs Production
- **Separate Supabase projects** for dev and production
- **Visual dev banner** when in development mode
- **Environment variables** clearly separated
- **Different database prefixes** or schemas

### Adding New Modules

The system is designed to be modular. To add a new module:

1. Add module configuration to `/src/config/modules.ts`
2. Create the module component in `/src/app/modules/[module-name]/page.tsx`
3. Define any specific Card fields or RSVP templates
4. Update permissions in the database

## Database Schema

### Core Tables (to be defined)
- `titles` - Film Cards
- `venues` - Venue Cards  
- `guests` - Guest Cards
- `press` - Press/Journalist Cards
- `programs` - Program Cards

### System Tables
- `user_permissions` - Role-based access control
- `rsvp_forms` - RSVP form definitions
- `rsvp_responses` - External RSVP submissions
- `rsvp_tokens` - Secure RSVP link tokens

## RSVP System

The platform generates secure, tokenized RSVP links for events. Features include:
- **Auto-linking**: If RSVP email matches existing Card, automatically links
- **Separate storage**: Non-Card RSVPs stored separately, never auto-create Cards
- **Module-specific templates**: Different form fields per module type
- **Token security**: Time-limited, secure tokens for external access

## Contributing

1. Create feature branch from `develop`
2. Make changes following existing patterns
3. Test in development environment
4. Submit pull request to `develop` branch

## Deployment

### Vercel Deployment
1. Connect repository to Vercel
2. Set production environment variables
3. Deploy from `main` branch

### Environment Variables (Production)
```env
NEXT_PUBLIC_SUPABASE_URL=production_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=production_anon_key
SUPABASE_SERVICE_ROLE_KEY=production_service_role_key
NODE_ENV=production
NEXT_PUBLIC_APP_ENV=production
NEXT_PUBLIC_SHOW_DEV_BANNER=false
```

## Architecture Notes

This platform is designed to be completely modular. Each new module can be added by simply:
1. Adding a config entry
2. Creating the module component
3. Following the established patterns

The system will handle routing, permissions, and UI patterns automatically.
