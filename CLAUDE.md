# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PsyAssist is a professional psychological assessment management system built with React + TypeScript + Vite. It's designed for psychologists to manage children's psychological assessments, generate reports, and track assessment progress with Hebrew localization and RTL support.

## Development Commands

```bash
# Development server (port 8080)
npm run dev

# Build for production
npm run build

# Build for development
npm run build:dev

# Lint code
npm run lint

# Preview production build
npm run preview
```

## Supabase CLI Commands

```bash
# Authenticate (required first)
npx supabase login

# Link to existing project
npx supabase link --project-ref piqujmgdejyttuoylzsx

# Generate TypeScript types
npx supabase gen types typescript --linked > src/integrations/supabase/types.ts

# Pull remote schema
npx supabase db pull

# Push local migrations
npx supabase db push

# Reset database (caution!)
npx supabase db reset

# Run SQL directly
npx supabase db shell
```

## Technology Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Supabase (PostgreSQL with RLS)
- **UI**: shadcn/ui + Tailwind CSS with RTL support
- **State**: TanStack Query + React Context for auth
- **Forms**: React Hook Form + Zod validation
- **Routing**: React Router DOM with protected routes

## Architecture Overview

### Core Pages Structure
- **Index (/)** - Dashboard with statistics
- **Children (/children)** - Child management with CRUD
- **Assessment (/assessment)** - Complex assessment form
- **Reports (/reports)** - Report generation
- **Auth** - Authentication with Supabase

### Key Components
- **Navigation** - Main nav with user management
- **AssessmentForm** - Multi-step form with score tracking (Z, S10, S100 scales)
- **ReportGenerator** - Professional report creation
- **Protected Routes** - Auth wrapper for secure pages

### Database Schema
Four main tables with RLS:
1. **profiles** - User information
2. **children** - Child records
3. **assessments** - Assessment data (JSONB for flexibility)
4. **reports** - Generated reports

## Authentication Flow

Uses Supabase Auth with:
- Email/password authentication
- Context-based state management (`useAuth` hook)
- Automatic profile creation on registration
- Session persistence with protected routes

## Development Patterns

### Form Handling
- React Hook Form with Zod validation
- Multi-step forms with progress tracking
- Hebrew language support with RTL layout
- Professional psychology theme with HSL colors

### Data Management
- TanStack Query for server state
- Supabase client for database operations
- Row Level Security ensures data isolation
- Real-time subscriptions available

### Styling
- Tailwind CSS with custom theme
- CSS variables for theming
- Path aliases (@/ for src/)
- Professional color palette for clinical use

## Key Features

### Assessment Management
- Multi-step assessment forms
- Score tracking with different scale types (Z, S10, S100)
- **XBA Cross-Battery Assessment** with CHC ability mapping
- Ability to select previously entered tests for CHC abilities
- Observation notes and recommendations
- Status tracking (draft, in-progress, completed)

### Child Management  
- Personal information tracking
- Age calculation
- Assessment history
- Search and filtering

### Report Generation
- Professional psychological reports
- Export functionality
- Template-based generation

## Hebrew/RTL Support

The application is built with Hebrew localization:
- RTL layout support
- Hebrew date formatting with date-fns
- Professional Hebrew typography
- Cultural considerations for psychology practice

## Integration Points

- **Supabase**: Database, auth, real-time subscriptions
- **Lovable Platform**: Connected for development and deployment
- **Component Tagging**: Development workflow integration

## Security Considerations

- Row Level Security (RLS) on all database tables
- Authentication required for all main functionality
- Input validation with Zod schemas
- Secure database policies for CRUD operations