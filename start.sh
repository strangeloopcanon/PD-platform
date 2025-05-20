#!/bin/bash

# Start script for the PyDough Platform

# Make script exit on error
set -e

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check for required commands
if ! command_exists npm; then
    echo "Error: npm is not installed. Please install Node.js and npm."
    exit 1
fi

if ! command_exists python3; then
    echo "Error: python3 is not installed. Please install Python 3."
    exit 1
fi

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting PyDough Platform...${NC}"

# Check if .env file exists in text_to_pydough directory, create a template if not
if [ ! -f "text_to_pydough/.env" ]; then
    echo -e "${YELLOW}No .env file found in text_to_pydough directory${NC}"
    echo -e "Creating template .env file at text_to_pydough/.env.example"

    cat > text_to_pydough/.env.example << EOL
# API Keys
# Replace with your actual API key from Google AI Studio (https://ai.google.dev/)
GEMINI_API_KEY=your_gemini_api_key_here

# Optional Configuration
# PORT=5001  # Change the port number if needed
# DEBUG=True  # Enable/disable debug mode
EOL

    echo -e "${YELLOW}To use your Gemini API key, copy .env.example to .env and add your key:${NC}"
    echo -e "cp text_to_pydough/.env.example text_to_pydough/.env"
    echo -e "Then edit text_to_pydough/.env with your API key"
fi

# Start Flask backend in a background process
echo -e "${YELLOW}Starting backend server...${NC}"
cd text_to_pydough

# Check if the virtual environment exists, if not create it
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment and install requirements
source venv/bin/activate

# Check if flask is already installed (as a proxy for all dependencies)
if ! python -c "import flask" &>/dev/null; then
    echo "Installing Python dependencies..."
    pip install -r requirements.txt
else
    echo "Dependencies already installed, skipping installation."
fi

# Make sure llm-gemini plugin is installed
if ! python -c "import llm_gemini" &>/dev/null; then
    echo "Installing llm-gemini plugin..."
    llm install llm-gemini
fi

# Start backend server
echo "Starting Flask API on port 5001..."
python app.py &
BACKEND_PID=$!
cd ..

# Start React frontend
echo -e "${YELLOW}Starting frontend development server...${NC}"
npm run dev &
FRONTEND_PID=$!

# Function to kill processes on exit
cleanup() {
    echo -e "${YELLOW}Shutting down servers...${NC}"
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    echo -e "${GREEN}Servers stopped.${NC}"
    exit 0
}

# Register the cleanup function to be called on SIGINT and SIGTERM
trap cleanup SIGINT SIGTERM

echo -e "${GREEN}Both servers are running!${NC}"
echo -e "Backend: http://localhost:5001"
echo -e "Frontend: http://localhost:5173"
echo -e "${YELLOW}Press Ctrl+C to stop both servers${NC}"

# Wait for both processes
wait
