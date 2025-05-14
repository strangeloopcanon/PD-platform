#!/bin/bash
# Setup script for LangGraph dependencies

echo "=== Setting up LangGraph for PyDough Platform ==="

# Make sure we're in the virtual environment
if [[ "$VIRTUAL_ENV" == "" ]]; then
  echo "No virtual environment detected."
  echo "Creating and activating a new virtual environment..."
  python -m venv venv
  source venv/bin/activate
else
  echo "Using existing virtual environment: $VIRTUAL_ENV"
fi

# Install LangGraph dependencies with exact versions
echo "Installing LangGraph dependencies with exact versions..."
pip install langgraph==0.0.24 langchain-core==0.1.6

# Install other requirements if needed
echo "Installing remaining requirements..."
pip install -r requirements.txt

echo "=== LangGraph setup complete! ==="
echo "You can now run the application with: python app.py"
echo "or test the LangGraph implementation with: python langgraph_interactive.py" 