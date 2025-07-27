# IndieShots Project Structure

## Overview
IndieShots is a full-stack TypeScript application for converting screenplay scripts to shot lists using AI-powered parsing.

## Directory Structure

```
/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Utility functions and configurations
│   │   ├── pages/          # Application pages/routes
│   │   └── main.tsx        # Application entry point
│   └── index.html          # HTML template
├── server/                 # Backend Express application
│   ├── auth/               # Authentication middleware
│   ├── controllers/        # Route handlers
│   ├── middleware/         # Custom middleware
│   ├── routes/             # API route definitions
│   ├── services/           # Business logic and external services
│   ├── utils/              # Server utility functions
│   ├── workers/            # Background job processors
│   └── index.ts            # Server entry point
├── shared/                 # Shared types and schemas
│   ├── schema.ts           # Database schema definitions
│   └── types.ts            # Shared TypeScript types
├── assets/                 # Static assets
├── docs/                   # Documentation
├── scripts/                # Utility scripts
├── screenshots/            # Application screenshots
└── config files           # Configuration files (package.json, etc.)
```

## Key Components

### Frontend (React + TypeScript)
- **Pages**: Upload, Dashboard, Review, Parse, Columns, Feedback
- **Authentication**: Firebase integration with demo mode
- **UI Library**: shadcn/ui components with Tailwind CSS
- **State Management**: TanStack Query for server state

### Backend (Express + TypeScript)
- **API Routes**: RESTful endpoints for scripts, jobs, and authentication
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Multiple providers (Firebase, JWT, OAuth)
- **File Processing**: Script parsing with OpenAI integration
- **Export**: XLSX/CSV generation for parsed data

### Database Schema
- **Users**: Authentication and subscription management
- **Scripts**: Uploaded screenplay files
- **ParseJobs**: Script processing tasks and results

## Development Environment

The application includes a comprehensive demo mode with:
- Sample screenplay data
- Mock user authentication
- Functional script parsing examples
- Full export capabilities

All endpoints work without authentication barriers for testing purposes.