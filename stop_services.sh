#!/bin/bash

# Drug-Drug Interaction Assistant - Service Stop Script

echo "🛑 Stopping Drug-Drug Interaction Assistant Services..."

# Function to stop a service
stop_service() {
    local name=$1
    local pid_file="${name}.pid"

    if [ -f "$pid_file" ]; then
        local pid=$(cat $pid_file)
        if ps -p $pid > /dev/null; then
            echo "🛑 Stopping $name (PID: $pid)..."
            kill $pid
            rm $pid_file
            echo "✅ $name stopped"
        else
            echo "ℹ️  $name was not running"
            rm $pid_file
        fi
    else
        echo "ℹ️  No PID file found for $name"
    fi
}

# Stop services
stop_service "frontend"
stop_service "api-service"
stop_service "ml-service"

# Kill any remaining processes on our ports
echo "🧹 Cleaning up any remaining processes..."

# Kill processes on specific ports
for port in 8080 3001 5000; do
    local pid=$(lsof -ti:$port)
    if [ ! -z "$pid" ]; then
        echo "🛑 Killing process on port $port (PID: $pid)"
        kill $pid
    fi
done

echo "✅ All services stopped"