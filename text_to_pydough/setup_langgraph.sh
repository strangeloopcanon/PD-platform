#!/bin/bash

# Script to set up LangGraph dependencies

# Display heading
echo "=================================="
echo "Setting up LangGraph dependencies"
echo "=================================="

# Activate the virtual environment if it exists
if [ -d "venv" ]; then
    echo "Activating virtual environment..."
    source venv/bin/activate
else
    echo "Creating virtual environment..."
    python -m venv venv
    source venv/bin/activate
fi

# Install dependencies from requirements-langgraph.txt
echo "Installing LangGraph dependencies..."
pip install -r requirements-langgraph.txt

# Check if langgraph was installed successfully
if python -c "import langgraph" 2>/dev/null; then
    echo "✅ LangGraph installed successfully!"
else
    echo "❌ Failed to install LangGraph. Please check the error messages above."
    exit 1
fi

# Reminder about API keys
echo ""
echo "🔑 Don't forget to set up your API keys if you haven't already:"
echo "1. Create a .env file in text_to_pydough/ directory with: GEMINI_API_KEY=your_api_key"
echo "   OR"
echo "2. Run: llm keys set gemini"
echo ""

echo "LangGraph setup complete! 🎉"
echo ""
echo "To test the LangGraph implementation, run:"
echo "python langgraph_interactive.py" 