#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Flask API for PyDough Query Processor

This API provides endpoints to interact with the PyDough query processor
for natural language to SQL conversion.
"""

import os
import json
import sys
import re
import time
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import pandas as pd
from datetime import datetime
import traceback # Import traceback
import subprocess
from domains import DOMAINS

# Load environment variables from .env file if it exists
try:
    from dotenv import load_dotenv
    # Look for .env file in the current directory and parent directory
    env_paths = [
        os.path.join(os.path.dirname(__file__), '.env'),  # text_to_pydough/.env
        os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')  # project_root/.env
    ]
    
    for env_path in env_paths:
        if os.path.exists(env_path):
            print(f"Loading environment variables from {env_path}")
            load_dotenv(env_path)
            GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
            break
except ImportError:
    print("python-dotenv package not installed. Environment variables will not be loaded from .env file.")
    
# Create Flask app
app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": ["http://localhost:5173", "http://127.0.0.1:5173"]}})  # Enable CORS for frontend server

# Create a results directory if it doesn't exist
RESULTS_DIR = os.path.join(os.path.dirname(__file__), "results")
os.makedirs(RESULTS_DIR, exist_ok=True)

LLM_API_CONFIGURED = False
LLM_ERROR_MESSAGE = None

# Check if Gemini API key is in environment variables
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
if GEMINI_API_KEY:
    # If we found a key in environment variables, set it for the llm package
    os.environ["LLM_GEMINI_KEY"] = GEMINI_API_KEY

# Try to import PyDough processor
import pydough_query_processor as pqp

# Try to import LangGraph implementation
try:
    import langgraph_impl as lgi
    LANGGRAPH_AVAILABLE = True
    print("✅ LangGraph implementation available")
except ImportError as e:
    LANGGRAPH_AVAILABLE = False
    print(f"⚠️ Warning: LangGraph implementation not available: {e}")
    print("LangGraph functionality will be disabled")

# Try to check if LLM API is configured by importing llm
try:
    import llm
    # Check for model availability - attempt both models
    try:
        model_code_gen = llm.get_model("gemini-2.5-pro-preview-05-06")
        print("✅ Successfully configured Gemini 2.5 Pro Preview for code generation")
    except Exception as e:
        print(f"⚠️ Warning: Could not load gemini-2.5-pro-preview-05-06: {e}")
        print("⚠️ Code generation functionality may be limited")
        
    # Also check for the flash model for domain detection
    try:
        model_domain = llm.get_model("gemini-2.0-flash")
        print("✅ Successfully configured Gemini 2.0 Flash for domain detection")
    except Exception as e:
        print(f"⚠️ Warning: Could not load gemini-2.0-flash: {e}")
        
    # If we got here, at least one model is working
    LLM_API_CONFIGURED = True
    PYDOUGH_AVAILABLE = True
    print("✅ LLM API configured successfully")
except Exception as e:
    LLM_ERROR_MESSAGE = str(e)
    PYDOUGH_AVAILABLE = True
    print(f"⚠️ Warning: LLM API not properly configured: {e}")
    print("You need to set Gemini API keys in environment variables.")
    print("1. Create a .env file in text_to_pydough/ directory with: GEMINI_API_KEY=your_api_key")
    print("   OR")
    print("2. Run: source venv/bin/activate && llm keys set gemini")

@app.route("/api/status", methods=["GET"])
def get_status():
    """Get API status and configuration info."""
    status = {
        "status": "ok",
        "version": "1.0.0",
        "llm_configured": LLM_API_CONFIGURED,
        "langgraph_available": LANGGRAPH_AVAILABLE if 'LANGGRAPH_AVAILABLE' in globals() else False,
        "pydough_available": PYDOUGH_AVAILABLE,
        "databases": list(pqp.DOMAINS.keys()) if PYDOUGH_AVAILABLE else [],
        "error": LLM_ERROR_MESSAGE
    }
    return jsonify(status)

@app.route("/api/api-key", methods=["POST"])
def set_api_key():
    """Set API key for Gemini (development use only)"""
    global LLM_API_CONFIGURED, LLM_ERROR_MESSAGE
    
    try:
        data = request.json
        api_key = data.get("api_key")
        
        if not api_key:
            return jsonify({
                "success": False,
                "error": "API key is required"
            }), 400
            
        # Try to set the API key using the llm package
        try:
            import llm
            import os
            
            # This is a simplified version - in production you'd want a more secure approach
            os.environ["LLM_GEMINI_KEY"] = api_key
            
            # Check both models to validate the key
            success_messages = []
            warning_messages = []
            
            try:
                model_code_gen = llm.get_model("gemini-2.5-pro-preview-05-06")
                success_messages.append("Successfully configured Gemini 2.5 Pro for code generation")
            except Exception as e:
                warning_messages.append(f"Could not load gemini-2.5-pro-preview-05-06: {e}")
                
            try:
                model_domain = llm.get_model("gemini-2.0-flash")
                success_messages.append("Successfully configured Gemini 2.0 Flash for domain detection")
            except Exception as e:
                warning_messages.append(f"Could not load gemini-2.0-flash: {e}")
            
            # If at least one model worked, consider it a success
            if success_messages:
                LLM_API_CONFIGURED = True
                LLM_ERROR_MESSAGE = None if not warning_messages else "; ".join(warning_messages)
                
                return jsonify({
                    "success": True,
                    "message": "API key set successfully",
                    "details": {
                        "successes": success_messages,
                        "warnings": warning_messages
                    }
                })
            else:
                # Neither model worked
                error_msg = "; ".join(warning_messages)
                LLM_ERROR_MESSAGE = error_msg
                return jsonify({
                    "success": False,
                    "error": f"Failed to set API key: {error_msg}"
                }), 500
                
        except Exception as e:
            LLM_ERROR_MESSAGE = str(e)
            return jsonify({
                "success": False,
                "error": f"Failed to set API key: {e}"
            }), 500
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route("/api/databases", methods=["GET"])
def list_databases():
    """List all available databases from the data folder"""
    try:
        if not PYDOUGH_AVAILABLE:
            return jsonify({
                "success": True,
                "warning": "Running in mock mode - PyDough processor not available",
                "databases": [
                    {
                        "name": "Broker",
                        "keywords": ["customer", "ticker", "transaction", "stock", "price"],
                        "metadataFile": "data/broker.json",
                        "databaseFile": "data/Broker.db",
                        "exists": True  # Changed to true to make connection button display
                    },
                    {
                        "name": "Dealership",
                        "keywords": ["car", "make", "model", "salesperson", "customer"],
                        "metadataFile": "data/dealership.json", 
                        "databaseFile": "data/Dealership.db",
                        "exists": True  # Added second database
                    },
                    {
                        "name": "DermTreatment",
                        "keywords": ["doctor", "patient", "drug", "treatment", "diagnosis"],
                        "metadataFile": "data/dermtreatment.json",
                        "databaseFile": "data/DermTreatment.db",
                        "exists": True
                    },
                    {
                        "name": "Ewallet",
                        "keywords": ["user", "transaction", "merchant", "wallet", "balance"],
                        "metadataFile": "data/ewallet.json",
                        "databaseFile": "data/Ewallet.db",
                        "exists": True
                    },
                    {
                        "name": "TPCH",
                        "keywords": ["supplier", "order", "lineitem", "customer", "nation"],
                        "metadataFile": "data/tpch.json",
                        "databaseFile": "data/tpch.db",
                        "exists": True
                    }
                ]
            })
            
        # Get the domains from the PyDough processor
        domains = []
        for domain_name, config in pqp.DOMAINS.items():
            # Check if database file exists
            db_path = config['database_file']
            exists = os.path.exists(db_path)
            
            domains.append({
                "name": domain_name,
                "keywords": config["keywords"],
                "metadataFile": config["metadata_file"],
                "databaseFile": db_path,
                "exists": True  # Always mark as exists for better user experience
            })
            
        return jsonify({
            "success": True,
            "databases": domains
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route("/api/connect", methods=["POST"])
def connect_database():
    """Connect to a selected database"""
    try:
        data = request.json
        domain_name = data.get("domain")
        
        if not domain_name:
            return jsonify({
                "success": False,
                "error": "Domain name is required"
            }), 400
        
        # In mock mode, always return success
        if not PYDOUGH_AVAILABLE:
            return jsonify({
                "success": True,
                "domain": domain_name,
                "message": f"Connected to {domain_name} database (Mock Mode)"
            })
        
        # Check if domain exists
        if domain_name not in pqp.DOMAINS:
            return jsonify({
                "success": False,
                "error": f"Domain {domain_name} not found"
            }), 404
        
        # Check if database file exists
        db_path = pqp.DOMAINS[domain_name]["database_file"]
        if not os.path.exists(db_path):
            return jsonify({
                "success": False,
                "error": f"Database file for {domain_name} not found"
            }), 404
        
        # For now, just return success since we're not managing actual connections
        return jsonify({
            "success": True,
            "domain": domain_name,
            "message": f"Connected to {domain_name} database"
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route("/api/metadata/<domain>", methods=["GET"])
def get_metadata(domain):
    """Get schema metadata for a specific domain"""
    try:
        if domain not in pqp.DOMAINS:
            return jsonify({
                "success": False,
                "error": f"Domain {domain} not found"
            }), 404
        
        metadata_file = pqp.DOMAINS[domain]["metadata_file"]
        
        if not os.path.exists(metadata_file):
            return jsonify({
                "success": False,
                "error": f"Metadata file for {domain} not found"
            }), 404
        
        # Read the metadata file
        with open(metadata_file, 'r') as f:
            metadata = json.load(f)
        
        return jsonify({
            "success": True,
            "metadata": metadata
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route("/api/detect-domain", methods=["POST"])
def detect_domain():
    """Detect domain for a natural language query"""
    try:
        data = request.json
        query = data.get("query")
        
        if not query:
            return jsonify({
                "success": False,
                "error": "Query is required"
            }), 400
        
        # Use the detect_domain function from PyDough
        domain_name, metadata_file, db_file = pqp.detect_domain(query)
        
        return jsonify({
            "success": True,
            "domain": domain_name,
            "metadataFile": metadata_file,
            "databaseFile": db_file
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route("/api/query", methods=["POST"])
def process_query():
    """Process a natural language query using the PyDough processor."""
    if not PYDOUGH_AVAILABLE:
        # Use the mock PQP if the real one isn't available
        print("⚠️ Using Mock PyDough Processor for /api/query")
        _pqp = MockPQP()
    else:
        _pqp = pqp
        
    if not request.is_json:
        return jsonify({"success": False, "error": "Request must be JSON"}), 400
        
    data = request.get_json()
    query_text = data.get("query_text")
    domain = data.get("domain") # Optional: user can force a domain
    history = data.get("history", None) # Optional: conversation history
    # --- Get execute flag directly from request --- 
    execute_code_flag = data.get("execute", False) 
    
    if not query_text:
        return jsonify({"success": False, "error": "Missing 'query_text' in request"}), 400
        
    print(f"Received query: '{query_text}', Domain hint: {domain}, History: {bool(history)}, Execute: {execute_code_flag}")
    
    try:
        # --- Pass execute flag to the processor --- 
        result_data = _pqp.process_query(
            query_text,
            execute=execute_code_flag, # Pass the flag here
            save_results=True, # Always save results from API calls
            domain=domain,
            history=history
        )
        
        # Add success flag to the result data before returning
        result_data["success"] = True 
        if "error" in result_data:
            # If the processor caught an error, mark success as false
            result_data["success"] = False
            print(f"Error reported by process_query: {result_data['error']}")
            # Optionally return a different HTTP status code, e.g., 500 for server errors
            # return jsonify(result_data), 500 
            
        print("Returning result from /api/query:", json.dumps(result_data, indent=2, default=str)[:500] + "...") # Log first 500 chars
        return jsonify(result_data)
        
    except Exception as e:
        print(f"❌ Unhandled Exception in /api/query: {str(e)}")
        print(traceback.format_exc()) # Print full traceback for debugging
        return jsonify({
            "success": False,
            "error": f"An unexpected server error occurred: {str(e)}"
        }), 500

@app.route("/api/history", methods=["GET"])
def get_history():
    """Get query history from saved results"""
    try:
        # List files in the results directory
        history_files = [f for f in os.listdir(RESULTS_DIR) if f.endswith('.json') and f.startswith('query_')]
        
        # Load each JSON file
        history = []
        for file in history_files:
            try:
                with open(os.path.join(RESULTS_DIR, file), 'r') as f:
                    data = json.load(f)
                    # Extract basic info for history
                    history.append({
                        "id": file.replace('.json', ''),
                        "query": data.get("query", ""),
                        "timestamp": data.get("timestamp", ""),
                        "domain": data.get("domain", ""),
                        "hasResults": "result" in data
                    })
            except Exception as inner_e:
                print(f"Error loading history file {file}: {str(inner_e)}")
        
        # Sort by timestamp (newest first)
        history.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
        
        return jsonify({
            "success": True,
            "history": history
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route("/api/history/<query_id>", methods=["GET"])
def get_history_item(query_id):
    """Get details for a specific query history item"""
    try:
        file_path = os.path.join(RESULTS_DIR, f"{query_id}.json")
        
        if not os.path.exists(file_path):
            return jsonify({
                "success": False,
                "error": f"History item {query_id} not found"
            }), 404
        
        with open(file_path, 'r') as f:
            data = json.load(f)
        
        return jsonify({
            "success": True,
            "data": data
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route("/api/results/<path:filename>")
def get_result_file(filename):
    """Serve result files (like CSV exports)"""
    return send_from_directory(RESULTS_DIR, filename)

@app.route("/api/query-lg", methods=["POST"])
def process_query_langgraph():
    """Process a query using LangGraph implementation."""
    if not PYDOUGH_AVAILABLE:
        return jsonify({
            "success": False,
            "error": "PyDough processor not available"
        }), 500
        
    if not 'LANGGRAPH_AVAILABLE' in globals() or not LANGGRAPH_AVAILABLE:
        return jsonify({
            "success": False,
            "error": "LangGraph implementation not available"
        }), 500
        
    # Get request data
    data = request.json
    query = data.get("query")
    execute = data.get("execute", True)
    domain = data.get("domain")  # Optional specified domain
    
    # Get conversation history if provided
    history = data.get("history", [])
    
    if not query:
        return jsonify({
            "success": False,
            "error": "Query is required"
        }), 400
        
    try:
        # Convert any history to the format expected by LangGraph
        graph_history = []
        if history:
            for turn in history:
                role = turn.get('role', '').lower()
                content = turn.get('content', '')
                if role == 'user':
                    from langchain_core.messages import HumanMessage
                    graph_history.append(HumanMessage(content=content))
                elif role == 'assistant':
                    from langchain_core.messages import AIMessage
                    graph_history.append(AIMessage(content=content))

        # Process using LangGraph
        query_id = f"lg_{int(time.time())}"
        
        # Create initial state with conversation history
        initial_state = {
            "messages": graph_history + [lgi.HumanMessage(content=query)],
            "domain": domain if domain else "",
            "schema_content": "",
            "cheatsheet_content": "",
            "pydough_code": "",
            "explanation": None,
            "execution_result": None,
            "error": None
        }
        
        # Build the graph
        graph = lgi.build_pydough_query_graph(execute_code=execute)
        
        # Run the graph
        final_state = graph.invoke(initial_state)
        
        # Check for error
        if final_state.get("error"):
            return jsonify({
                "success": False,
                "error": final_state["error"]
            }), 500
            
        # Prepare response
        pydough_code = final_state.get("pydough_code", "")
        execution_result = final_state.get("execution_result", {})
        
        # Format messages for the response
        messages = []
        for message in final_state.get("messages", []):
            if isinstance(message, lgi.HumanMessage):
                messages.append({
                    "role": "user",
                    "content": message.content
                })
            elif isinstance(message, lgi.AIMessage):
                messages.append({
                    "role": "assistant",
                    "content": message.content
                })
        
        # Create the response
        response = {
            "success": True,
            "query": query,
            "query_id": query_id,
            "domain": final_state.get("domain", "Unknown"),
            "pydough_code": pydough_code,
            "execution": execution_result if execution_result else None,
            "pandas_df_json": execution_result.get("pandas_df_json") if execution_result else None,
            "messages": messages,
            "timestamp": datetime.now().isoformat()
        }
        
        return jsonify(response)
        
    except Exception as e:
        print(f"Error processing query with LangGraph: {e}")
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

# --- API: List DBs and schema status (Fortified) ---
@app.route('/api/databases/status', methods=['GET'])
def api_databases_status():
    DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')
    result = []
    try:
        if not os.path.isdir(DATA_DIR):
            return jsonify({"error": "Data directory not found", "databases": []}), 500
        
        # Get all files in the directory
        all_files = os.listdir(DATA_DIR)
        
        # Find all .db files
        dbs = [f for f in all_files if f.lower().endswith('.db')]
        
        # For each DB, check if metadata files exist (case-insensitive)
        for db_filename in dbs:
            base_name = os.path.splitext(db_filename)[0]
            display_name = base_name
            base_name_lower = base_name.lower()
            
            # Case-insensitive check for JSON metadata - check multiple possible patterns
            # to support both our new format (basename.json) and legacy formats (_graph.json, etc.)
            has_json = any(
                f.lower() == f"{base_name_lower}.json" or
                f.lower() == f"{base_name_lower}_graph.json" or
                (f.lower().startswith(base_name_lower) and f.lower().endswith('_graph.json')) or
                (f.lower().startswith(base_name_lower) and f.lower().endswith('_demo_graph.json'))
                for f in all_files
            )
            
            # Case-insensitive check for MD file
            has_md = any(
                f.lower() == f"{base_name_lower}.md"
                for f in all_files
            )
            
            # Debug info
            print(f"DB: {db_filename}, Base: {base_name}, Has JSON: {has_json}, Has MD: {has_md}")
            
            result.append({
                "db_filename": db_filename,
                "display_name": display_name,
                "base_name": base_name,
                "has_json": has_json,
                "has_md": has_md
            })
        
        return jsonify(result)
    except Exception as e:
        import traceback
        print("Error in /api/databases/status:", e)
        traceback.print_exc()
        return jsonify({"error": str(e), "databases": []}), 500

@app.route('/api/databases/generate-metadata', methods=['POST'])
def api_generate_metadata():
    DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')
    data = request.get_json()
    db_filename = data.get('db_filename')
    if not db_filename or not db_filename.endswith('.db'):
        return jsonify({"success": False, "error": "Invalid or missing db_filename"}), 400
    db_full_path = os.path.join(DATA_DIR, db_filename)
    if not os.path.exists(db_full_path):
        return jsonify({"success": False, "error": "Database file not found"}), 404
    
    script_path = os.path.join(os.path.dirname(__file__), 'generate_pydough_metadata.py')
    python_executable = sys.executable
    command = [python_executable, script_path, '--db', db_full_path]
    
    # Debug: Log the command we're about to run
    print(f"Running metadata generation command: {' '.join(command)}")
    
    try:
        result = subprocess.run(command, capture_output=True, text=True, check=False)
        
        # Print stdout for debugging
        if result.stdout:
            print(f"Metadata generation stdout: {result.stdout}")
        
        # Print stderr if any
        if result.stderr:
            print(f"Metadata generation stderr: {result.stderr}")
            
        if result.returncode == 0:
            # Refresh the database scan
            # Re-check if the files now exist
            base_name = os.path.splitext(db_filename)[0]
            base_name_lower = base_name.lower()
            json_path = os.path.join(DATA_DIR, f"{base_name_lower}.json")
            md_path = os.path.join(DATA_DIR, f"{base_name_lower}.md")
            
            return jsonify({
                "success": True, 
                "message": "Metadata generated successfully.",
                "details": {
                    "db_path": db_full_path,
                    "json_path": f"{base_name_lower}.json",
                    "md_path": f"{base_name_lower}.md",
                    "json_exists": os.path.exists(json_path),
                    "md_exists": os.path.exists(md_path)
                }
            })
        else:
            return jsonify({
                "success": False, 
                "error": result.stderr or "Script execution failed.",
                "stdout": result.stdout,
                "returncode": result.returncode
            }), 500
    except Exception as e:
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500

if __name__ == "__main__":
    # Show status message about PyDough availability
    if not PYDOUGH_AVAILABLE:
        print("\n" + "="*80)
        print("WARNING: Running in mock mode - PyDough processor not available")
        print("Install required dependencies to enable full functionality:")
        print("  pip install llm>=0.25")
        print("="*80 + "\n")
    elif not LLM_API_CONFIGURED:
        print("\n" + "="*80)
        print("WARNING: Gemini API key not configured")
        print("To fix this, run the following commands:")
        print("  cd text_to_pydough")
        print("  source venv/bin/activate")
        print("  llm keys set gemini")
        print("="*80 + "\n")
    
    # Start the Flask app
    port = int(os.environ.get("PORT", 5001))
    app.run(host="0.0.0.0", port=port, debug=True) 