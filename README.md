# PieceOfMind - Drug-Drug Interaction Assistant
## HackGT Submission by Ashwin V and Vaibhav W

A comprehensive web application that helps healthcare providers identify potential drug-drug interactions using AI and machine learning.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.8+
- Git

### One-Command Setup
```bash
# Clone and start all services
git clone <your-repo-url>
cd PieceofMind
./start_services.sh
```

Then visit **http://localhost:8080** to use the application.

### Stop Services
```bash
./stop_services.sh
```

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React Frontend │────│  Express.js API  │────│ Python ML Service│
│   (Port 8080)   │    │   (Port 3001)    │    │   (Port 5000)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                       ┌─────────────┐
                       │  Supabase   │
                       │  Database   │
                       └─────────────┘
```

### Tech Stack
- **Frontend**: React + TypeScript + Vite + shadcn/ui
- **API Layer**: Node.js + Express + Supabase
- **ML Service**: Python + FastAPI + OpenAI + Sentence Transformers
- **Database**: Supabase (PostgreSQL)

## 📊 Features

### Core Functionality
- ✅ **Patient Management**: Select and view patient medication profiles
- ✅ **Real-time DDI Detection**: Multi-layered interaction checking
- ✅ **Severity Classification**: Mild, Moderate, Severe risk levels
- ✅ **Clinical Recommendations**: Actionable guidance for providers
- ✅ **Multiple Detection Methods**: Static rules, ML similarity, AI-powered analysis

### Detection Methods
1. **Static Database Lookup**: Known high-confidence interactions
2. **ML Similarity Matching**: Sentence transformer embeddings with FAISS
3. **AI-Powered Analysis**: OpenAI GPT-4 with drug profile context
4. **Fallback Logic**: Rule-based classification for unknown combinations

## 🧪 Demo Data

The application includes realistic demo data:
- **6 Common Drugs**: Warfarin, Atorvastatin, Lisinopril, Metformin, Ibuprofen, Fluoxetine
- **4 Sample Patients**: With various medication combinations and conditions
- **Known Interactions**: Evidence-based interaction profiles

### Sample Severe Interaction
**Warfarin + Ibuprofen**: Demonstrates severe bleeding risk with clear clinical recommendations.

## 🔧 Development

### Manual Setup

#### 1. Database Setup
```bash
# Run the SQL schema in your Supabase project
cat supabase_schema.sql
# Copy/paste into Supabase SQL editor
```

#### 2. Backend API
```bash
cd api
npm install
# Update .env with your Supabase credentials
npm start  # Runs on port 3001
```

#### 3. ML Service
```bash
cd ml
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
# Optional: Add OpenAI API key to .env for enhanced AI features
python main.py  # Runs on port 5000
```

#### 4. Frontend
```bash
cd frontend
npm install
npm run dev  # Runs on port 8080
```

### API Endpoints

#### Express API (Port 3001)
- `GET /api/health` - Service health check
- `GET /api/patients` - List all patients
- `GET /api/patients/:id` - Get specific patient
- `POST /api/check-interactions` - Check drug interactions
- `GET /api/drugs` - List available drugs

#### ML Service (Port 5000)
- `GET /health` - ML service health
- `POST /interactions/check` - AI-powered interaction analysis
- `GET /docs` - FastAPI documentation

## 🎯 Usage Flow

1. **Provider logs in** → Redirects to dashboard
2. **Select patient** → View current medications and conditions
3. **Check interactions** → Click "Check Drug Interactions"
4. **Review results** → Color-coded severity with clinical recommendations
5. **Take action** → Follow provided clinical guidance

## 🛡️ Configuration

### Environment Variables

**API Service** (api/.env):
```bash
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
ML_BASE=http://localhost:5000
PORT=3001
```

**ML Service** (ml/.env):
```bash
OPENAI_API_KEY=your_openai_key  # Optional for enhanced AI
MODEL_NAME=all-MiniLM-L6-v2
LOG_LEVEL=INFO
```

**Frontend** (frontend/.env):
```bash
VITE_API_BASE_URL=http://localhost:3001
```

## 🚨 Important Notes

### For Hackathon Demo
- ✅ All services can run locally
- ✅ Demo data is pre-loaded
- ✅ No external API keys required for basic functionality
- ✅ OpenAI integration is optional (falls back to rule-based)

### Production Considerations
- 🔐 Implement proper authentication
- 🛡️ Add rate limiting and input validation
- 📊 Use real medical databases (FDA Orange Book, etc.)
- 🏥 HIPAA compliance measures
- 🔍 Clinical validation of interaction rules

## 🎓 Educational Value

This project demonstrates:
- **Full-stack architecture** with modern technologies
- **Multi-modal AI integration** (embeddings + generative AI)
- **Healthcare data handling** with appropriate safeguards
- **Real-world problem solving** in medical informatics
- **Scalable service design** with microservice patterns

## 🤝 Contributing

Built for HackGT by Ashwin V and Vaibhav W.

## 📄 License

MIT License - see LICENSE file for details.

---

**⚡ Ready to demo!** Run `./start_services.sh` and visit http://localhost:8080

