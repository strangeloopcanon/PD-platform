#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
LangGraph Interactive Mode for PyDough Query Processor

This script provides an interactive command line interface for querying databases
using natural language, powered by LangGraph for improved state management.
"""

import os
import sys
import argparse
from datetime import datetime
from typing import Dict, List, Optional

from langchain_core.messages import HumanMessage, AIMessage
from langgraph.checkpoint.memory import MemorySaver

# Import from our LangGraph implementation
from langgraph_impl import (
    process_query_with_graph,
    build_pydough_query_graph,
    QueryState
)

def print_welcome_message():
    """Print welcome message with ASCII art and instructions."""
    welcome_text = """
    ╔═════════════════════════════════════════════════════════╗
    ║                                                         ║
    ║   🧩 PyDough Query Processor - LangGraph Interactive    ║
    ║                                                         ║
    ╚═════════════════════════════════════════════════════════╝

    Ask questions in natural language about your databases.
    Type 'exit', 'quit', or press Ctrl+C to exit.
    Type 'help' for more information.
    Type 'clear' to start a new conversation.
    """
    print(welcome_text)

def print_help():
    """Print help information for users."""
    help_text = """
    Available Commands:
    ------------------
    exit, quit - Exit the application
    help       - Display this help information
    clear      - Clear the conversation history and start fresh
    
    Query Examples by Domain:
    -----------------------
    Broker:
      - "Show me all customers"
      - "Find transactions with more than 100 shares"
      - "What are the top 5 most traded stocks?"
    
    TPCH:
      - "Show me all customers from the US"
      - "Find the total value of orders placed in January 1995"
      - "What are the top suppliers by revenue?"
    
    Dealership:
      - "Show me all cars in inventory"
      - "Find sales made by salesperson John"
      - "What is the most popular car model?"
    
    DermTreatment:
      - "List all patients with dermatitis"
      - "Find treatments prescribed for eczema"
      - "Which doctor has treated the most patients?"
    
    Ewallet:
      - "Show me all transactions over $100"
      - "Find users with negative balance"
      - "What is the total transaction amount by merchant?"
    """
    print(help_text)

def interactive_mode(args):
    """
    Run the interactive mode with LangGraph implementation.
    
    This function provides a command line interface for users to
    enter natural language queries and get results using the stateful
    LangGraph processing pipeline.
    """
    print_welcome_message()
    
    # Keep track of conversation history for the session
    conversation_history = []
    
    # Create a memory checkpointer for stateful conversations
    checkpointer = MemorySaver()
    
    # Build the graph with checkpointer
    graph = build_pydough_query_graph(execute_code=not args.no_execute)
    # Add the compile step back for LangGraph 0.0.24
    graph = graph.compile(checkpointer=checkpointer)
    
    # Initialize the session state
    config = None

    try:
        while True:
            # Get user query
            query = input("\n🔍 Enter your query: ")
            
            # Process commands
            if query.lower() in ['exit', 'quit']:
                print("👋 Goodbye!")
                break
            elif query.lower() == 'help':
                print_help()
                continue
            elif query.lower() == 'clear':
                print("🧹 Starting a new conversation...")
                conversation_history = []
                config = None
                continue
            elif not query.strip():
                print("⚠️ Please enter a valid query.")
                continue
                
            print("⏳ Processing your query...")
            
            try:
                # Create the initial state for a new conversation
                if not config:
                    initial_state = {
                        "messages": [HumanMessage(content=query)],
                        "domain": "",
                        "schema_content": "",
                        "cheatsheet_content": "",
                        "pydough_code": "",
                        "explanation": None,
                        "execution_result": None,
                        "error": None
                    }
                    config = {"configurable": {"thread_id": f"thread-{datetime.now().timestamp()}"}}
                    
                    # Use invoke() for CompiledStateGraph
                    print("\n🔄 Response:")
                    result = graph.invoke(initial_state, config=config)
                    
                    # Display the messages
                    if "messages" in result:
                        for message in result["messages"]:
                            if isinstance(message, AIMessage):
                                print(f"🤖 {message.content}")
                else:
                    # For continuing the conversation, use invoke() for CompiledStateGraph
                    input_state = {"messages": [HumanMessage(content=query)]}
                    
                    print("\n🔄 Response:")
                    result = graph.invoke(input_state, config=config)
                    
                    # Display the messages
                    if "messages" in result:
                        for message in result["messages"]:
                            if isinstance(message, AIMessage):
                                print(f"🤖 {message.content}")
                
                # Store results for history
                domain = result.get("domain", "Unknown")
                pydough_code = result.get("pydough_code", "")
                error = result.get("error")
                
                if error:
                    print(f"\n⚠️ Error: {error}")
                
                # Add to conversation history
                conversation_history.append({
                    "role": "user",
                    "content": query,
                    "timestamp": datetime.now().isoformat()
                })
                
                for message in result.get("messages", []):
                    if isinstance(message, AIMessage):
                        conversation_history.append({
                            "role": "assistant",
                            "content": message.content,
                            "timestamp": datetime.now().isoformat()
                        })
                
            except KeyboardInterrupt:
                print("\n⚠️ Query processing interrupted.")
                continue
            except Exception as e:
                print(f"\n❌ Error processing query: {str(e)}")
                continue
    
    except KeyboardInterrupt:
        print("\n👋 Goodbye!")
    except Exception as e:
        print(f"\n❌ An unexpected error occurred: {str(e)}")
    
    print("\nThank you for using PyDough Query Processor!")
    
def main():
    """Parse arguments and run the appropriate mode."""
    parser = argparse.ArgumentParser(description="PyDough Query Processor with LangGraph")
    parser.add_argument("--no-execute", action="store_true", 
                        help="Generate code only without executing it")
    args = parser.parse_args()
    
    # Always run in interactive mode for this script
    interactive_mode(args)

if __name__ == "__main__":
    main() 