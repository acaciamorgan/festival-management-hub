# FX Management V2 - Event Interview Coordinator

A comprehensive React application for managing celebrity interviews at events. Built with modern web technologies and deployed on Vercel with Supabase backend.

## Features

- **Celebrity Management**: Browse and manage celebrity attendees with categories (Celebrity, Voice, Artist, Exec)
- **Interview Coordination**: Submit and track interview requests with priority management
- **Real-time Messaging**: General chat, direct messages, and targeted communications
- **Press Materials**: Access to press kits and media resources
- **Role-based Access**: Separate views for journalists and PR team members
- **Responsive Design**: Mobile-friendly interface built with Tailwind CSS

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Backend**: Supabase (PostgreSQL)
- **Deployment**: Vercel
- **Version Control**: GitHub

## Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account
- Vercel account (for deployment)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/morganharris/FX-ManagementV2.git
cd FX-ManagementV2
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Update `.env` with your Supabase credentials:
```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

5. Start the development server:
```bash
npm run dev
```

## Database Setup

The application uses Supabase for data storage. You'll need to create the following tables:

- `celebrities` - Celebrity information and availability
- `journalists` - Journalist profiles and outlets
- `interview_requests` - Interview request management
- `messages` - Chat and messaging system

Refer to `/src/lib/supabase.ts` for the complete database schema.

## Deployment

### Vercel Deployment

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Manual Deployment

```bash
npm run build
npm run preview
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

## Project Structure

```
src/
├── components/          # React components
├── lib/                # Utilities and configurations
├── types/              # TypeScript type definitions
├── hooks/              # Custom React hooks
├── App.tsx             # Main application component
├── main.tsx            # Application entry point
└── index.css           # Global styles
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For issues and questions, please open an issue on GitHub.