#!/bin/bash

# Drug-Drug Interaction Assistant - Service Startup Script
# This script starts all required services for the DDI Assistant

echo "🚀 Starting Drug-Drug Interaction Assistant Services..."

# Function to check if a port is available
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        echo "⚠️  Port $1 is already in use. Please stop the service or use a different port."
        return 1
    fi
    return 0
}

# Function to start a service in the background
start_service() {
    local name=$1
    local dir=$2
    local command=$3
    local port=$4

    echo "📦 Starting $name service..."

    if ! check_port $port; then
        return 1
    fi

    cd $dir
    echo "🔧 Running: $command"
    eval $command &
    local pid=$!
    echo "✅ $name started (PID: $pid) on port $port"
    echo $pid > "${name}.pid"
    cd ..
}

# Check if required directories exist
if [ ! -d "frontend" ] || [ ! -d "api" ] || [ ! -d "ml" ]; then
    echo "❌ Error: Required directories not found. Please run this script from the project root."
    exit 1
fi

# Start Python ML Service (FastAPI)
echo "🐍 Setting up Python ML service..."
cd ml
if [ ! -d "venv" ]; then
    echo "📦 Creating Python virtual environment..."
    python3 -m venv venv
fi

echo "📦 Activating virtual environment..."
source venv/bin/activate

echo "📦 Installing Python dependencies..."
pip install -q -r requirements.txt

cd ..
start_service "ml-service" "ml" "source venv/bin/activate && python main.py" 5000

# Start Express API
echo "🟢 Setting up Node.js API service..."
cd api
if [ ! -d "node_modules" ]; then
    echo "📦 Installing Node.js dependencies..."
    npm install
fi
cd ..
start_service "api-service" "api" "npm start" 3001

# Start Frontend (Vite)
echo "⚛️  Setting up React frontend..."
cd frontend
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
fi
cd ..
start_service "frontend" "frontend" "npm run dev" 8080

echo ""
echo "🎉 All services started successfully!"
echo ""
echo "📋 Service URLs:"
echo "   🌐 Frontend:     http://localhost:8080"
echo "   🔗 API:          http://localhost:3001"
echo "   🤖 ML Service:   http://localhost:5000"
echo ""
echo "🔍 API Endpoints:"
echo "   📊 Health:       http://localhost:3001/api/health"
echo "   👥 Patients:     http://localhost:3001/api/patients"
echo "   💊 Drugs:        http://localhost:3001/api/drugs"
echo "   🔍 ML Docs:      http://localhost:5000/docs"
echo ""
echo "🛑 To stop all services, run: ./stop_services.sh"
echo ""
echo "⏳ Waiting for services to initialize..."
sleep 5

echo "🔍 Checking service health..."

# Check ML service health
if curl -s http://localhost:5000/health > /dev/null; then
    echo "✅ ML Service is healthy"
else
    echo "❌ ML Service health check failed"
fi

# Check API service health
if curl -s http://localhost:3001/api/health > /dev/null; then
    echo "✅ API Service is healthy"
else
    echo "❌ API Service health check failed"
fi

# Check frontend
if curl -s http://localhost:8080 > /dev/null; then
    echo "✅ Frontend is running"
else
    echo "❌ Frontend health check failed"
fi

echo ""
echo "🎯 Ready for demo! Open http://localhost:8080 in your browser"