# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PieceOfMind is a HackGT submission for drug-drug interaction (DDI) detection. It's a comprehensive full-stack application that helps healthcare professionals identify potential drug interactions using AI and machine learning.

**Architecture:**
- **Frontend**: Vite + React + TypeScript with shadcn/ui components
- **Backend**: Express.js API layer with Supabase integration
- **ML Service**: Python FastAPI with OpenAI + Sentence Transformers
- **Database**: Supabase (PostgreSQL) with complete schema

## Development Commands

### Quick Start (All Services)
```bash
# Start all services (frontend, API, ML)
./start_services.sh

# Stop all services
./stop_services.sh
```

### Frontend Commands (from `frontend/` directory)
```bash
# Development server (runs on port 8080)
npm run dev

# Build for production
npm run build

# Lint code
npm run lint

# Preview production build
npm run preview
```

### API Commands (from `api/` directory)
```bash
# Start Express API (port 3001)
npm start
npm run dev  # With nodemon
```

### ML Service Commands (from `ml/` directory)
```bash
# Setup virtual environment
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Start FastAPI service (port 5000)
python main.py
```

## Key Technologies & Libraries

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite with SWC plugin
- **UI Components**: Radix UI primitives + shadcn/ui
- **Styling**: Tailwind CSS with custom configuration
- **State Management**: React Query (TanStack Query)
- **Database**: Supabase client configured
- **Routing**: React Router DOM
- **Forms**: React Hook Form with Zod validation

## Project Structure

```
frontend/src/
├── components/          # Reusable UI components including shadcn/ui
├── pages/              # Route components (Dashboard, Login, NotFound)
├── integrations/       # External service integrations (Supabase)
├── hooks/              # Custom React hooks
├── lib/                # Utility functions
├── types/              # TypeScript type definitions
└── App.tsx             # Main application with routing setup
```

## Important Configuration

- **Path Aliases**: `@/*` maps to `./src/*` for clean imports
- **TypeScript**: Configured with relaxed settings (no strict null checks, unused vars allowed)
- **ESLint**: TypeScript ESLint with React hooks rules, unused vars disabled
- **Supabase**: Client configured with local storage persistence and auto-refresh

## Application Features

### Multi-layered DDI Detection System
- **Static Database Lookup**: Known high-confidence interactions from medical literature
- **ML Similarity Matching**: Sentence transformer embeddings with FAISS indexing
- **AI-Powered Analysis**: OpenAI GPT-4 integration with drug profile context
- **Fallback Logic**: Rule-based classification for unknown combinations

### User Interface
- Patient management with real Supabase data
- Color-coded severity display (mild/moderate/severe)
- Clinical recommendations and evidence sources
- Real-time service health monitoring
- Interactive dashboard with detailed interaction cards

### Backend Services
- **Express API**: RESTful endpoints for patient/drug data and interaction checking
- **Python ML Service**: FastAPI with multiple detection algorithms
- **Supabase Database**: PostgreSQL with patients, drugs, and interaction logs

## Development Notes

### Service Architecture
- Frontend (React): Port 8080
- Express API: Port 3001
- Python ML Service: Port 5000
- Supabase: Cloud-hosted PostgreSQL

### Key Files
- `supabase_schema.sql`: Database schema and seed data
- `api/server.js`: Enhanced Express API with complete endpoints
- `ml/main.py`: FastAPI ML service with AI integration
- `ml/drug_interactions_dataset.json`: Comprehensive drug interaction data
- `frontend/src/services/api.ts`: API client for backend communication
- `frontend/src/pages/NewDashboard.tsx`: Main dashboard with real backend integration

### Environment Setup
- Supabase credentials configured in `api/.env`
- Optional OpenAI API key in `ml/.env` for enhanced AI features
- Frontend API base URL in `frontend/.env`

### Testing and Demo
- Demo data includes 6 common drugs and 4 sample patients
- Known severe interaction: Warfarin + Ibuprofen (bleeding risk)
- All services can run locally without external dependencies
- OpenAI integration gracefully falls back to rule-based analysis