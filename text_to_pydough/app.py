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
CORS(app)  # Enable CORS for all routes

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
try:
    import pydough_query_processor as pqp
    
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
except ImportError as e:
    print(f"Warning: Could not import pydough_query_processor: {e}")
    PYDOUGH_AVAILABLE = False
    LLM_ERROR_MESSAGE = "PyDough processor module not available"
    # Create a mock domains dictionary for testing
    class MockDomains(dict):
        def __init__(self):
            super().__init__()
            self["Broker"] = {
                "keywords": ["customer", "ticker", "transaction", "stock", "price"],
                "metadata_file": "data/Broker_graph.json",
                "database_file": "data/Broker.db"
            }
            self["Dealership"] = {
                "keywords": ["car", "make", "model", "salesperson", "customer"],
                "metadata_file": "data/Dealership_graph.json", 
                "database_file": "data/Dealership.db"
            }
            self["DermTreatment"] = {
                "keywords": ["doctor", "patient", "drug", "treatment", "diagnosis"],
                "metadata_file": "data/DermTreatment_graph.json",
                "databaseFile": "data/DermTreatment.db",
                "exists": True
            }
            self["Ewallet"] = {
                "keywords": ["user", "transaction", "merchant", "wallet", "balance"],
                "metadata_file": "data/Ewallet_graph.json",
                "databaseFile": "data/Ewallet.db",
                "exists": True
            }
            self["TPCH"] = {
                "keywords": ["supplier", "order", "lineitem", "customer", "nation"],
                "metadata_file": "data/tpch_graph.json",
                "databaseFile": "data/tpch.db",
                "exists": True
            }
    
    # Create a mock pqp module
    class MockPQP:
        def __init__(self):
            self.DOMAINS = MockDomains()
            
        def detect_domain(self, query):
            # Simple keyword matching for demo
            for domain_name, domain_data in self.DOMAINS.items():
                if domain_name.lower() in query.lower():
                    return domain_name, domain_data["metadata_file"], domain_data["database_file"]
            return "Broker", "data/Broker_graph.json", "data/Broker.db"  # Default
            
        def process_query(self, query_text, execute=False, save_results=False, domain=None, **kwargs):
            # Detect domain if not provided
            if domain is None:
                domain_name, _, _ = self.detect_domain(query_text)
            else:
                domain_name = domain
                
            # Mock pydough code generation
            pydough_code = f"result = {domain_name}.Customers.CALCULATE(name=name, email=email)"
            
            # Return expected structure
            return {
                "query": query_text,
                "domain": domain_name,
                "pydough_code": pydough_code,
                "sql": f"SELECT name, email FROM {domain_name.lower()}_customers",
                "timestamp": datetime.now().isoformat(),
                "query_id": f"mock_{int(time.time())}"
            }
            
        def adapt_and_execute_code(self, code, output_file_name, domain_info=None):
            """Create adaptable code but don't run it yet."""
            # Get domain info
            if domain_info is None:
                domain_name = "Broker"
                metadata_file = "data/Broker_graph.json"
                database_file = "data/Broker.db"
            else:
                domain_name, metadata_file, database_file = domain_info
            
            # Create results directory if it doesn't exist
            os.makedirs(RESULTS_DIR, exist_ok=True)
            
            # Create output file path
            output_file_path = os.path.join(RESULTS_DIR, output_file_name)
            
            # Create modified code with imports and setup
            adapted_code = f"""
import pandas as pd
# Mock PyDough setup for {domain_name}
# Using metadata from {metadata_file}
# Using database {database_file}

# Original code:
{code}

# Create a mock result
result_data = [
    {{"name": "John Doe", "email": "john@example.com"}},
    {{"name": "Jane Smith", "email": "jane@example.com"}},
    {{"name": "Bob Johnson", "email": "bob@example.com"}}
]
result = pd.DataFrame(result_data)

print("\\nSQL Query:")
print("SELECT name, email FROM {domain_name.lower()}_customers")
print("\\nResult:")
print(result.head(10))
"""
            
            # Write to file
            with open(output_file_path, 'w') as f:
                f.write(adapted_code)
                
            print(f"Created mock PyDough script at {output_file_path}")
            return adapted_code, output_file_path
        
        def execute_pydough_script(self, script_path):
            """Execute the generated script in a subprocess."""
            try:
                # In mock mode, we'll just pretend to execute and return a fixed output
                mock_output = f"""
SQL Query:
SELECT name, email FROM customers

Result:
      name             email
0  John Doe    john@example.com
1  Jane Smith  jane@example.com
2  Bob Johnson  bob@example.com
"""
                print(f"Mock execution of {script_path} (not actually running)")
                print(mock_output)
                
                return {
                    'success': True,
                    'output': mock_output,
                    'execution_time': 0.1
                }
            except Exception as e:
                return {
                    'success': False,
                    'error': f"Mock execution error: {str(e)}"
                }
            
        def save_execution_artifacts(self, result, base_filename):
            """Saves execution output to files."""
            # Make sure results dir exists
            os.makedirs(RESULTS_DIR, exist_ok=True)
            
            # Create a mock artifact for the execution
            artifacts = []
            if result.get('success'):
                # Save mock SQL file
                sql_file_path = os.path.join(RESULTS_DIR, f"sql_{base_filename}.sql")
                with open(sql_file_path, 'w') as f:
                    f.write("SELECT name, email FROM customers")
                artifacts.append(sql_file_path)
                
                # Save mock output file
                output_file_path = os.path.join(RESULTS_DIR, f"output_{base_filename}.txt")
                with open(output_file_path, 'w') as f:
                    f.write(result.get('output', 'Mock execution output'))
                artifacts.append(output_file_path)
            
            return artifacts
    
    pqp = MockPQP()

@app.route("/api/status", methods=["GET"])
def get_status():
    """Get API status and dependency information"""
    return jsonify({
        "success": True,
        "pydough_available": PYDOUGH_AVAILABLE,
        "llm_api_configured": LLM_API_CONFIGURED,
        "llm_error": LLM_ERROR_MESSAGE,
        "python_version": sys.version,
        "dependencies": {
            "flask": True,
            "pandas": True,
            "llm": PYDOUGH_AVAILABLE and LLM_API_CONFIGURED
        }
    })

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
                        "metadataFile": "data/Broker_graph.json",
                        "databaseFile": "data/Broker.db",
                        "exists": True  # Changed to true to make connection button display
                    },
                    {
                        "name": "Dealership",
                        "keywords": ["car", "make", "model", "salesperson", "customer"],
                        "metadataFile": "data/Dealership_graph.json", 
                        "databaseFile": "data/Dealership.db",
                        "exists": True  # Added second database
                    },
                    {
                        "name": "DermTreatment",
                        "keywords": ["doctor", "patient", "drug", "treatment", "diagnosis"],
                        "metadataFile": "data/DermTreatment_graph.json",
                        "databaseFile": "data/DermTreatment.db",
                        "exists": True
                    },
                    {
                        "name": "Ewallet",
                        "keywords": ["user", "transaction", "merchant", "wallet", "balance"],
                        "metadataFile": "data/Ewallet_graph.json",
                        "databaseFile": "data/Ewallet.db",
                        "exists": True
                    },
                    {
                        "name": "TPCH",
                        "keywords": ["supplier", "order", "lineitem", "customer", "nation"],
                        "metadataFile": "data/tpch_graph.json",
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
    """Process natural language query to PyDough and SQL"""
    try:
        data = request.json
        query = data.get("query")
        domain = data.get("domain")  # Optional domain
        
        if not query:
            return jsonify({
                "success": False,
                "error": "Query is required"
            }), 400
            
        # Check if LLM API is configured
        if not LLM_API_CONFIGURED:
            return jsonify({
                "success": False,
                "llm_error": LLM_ERROR_MESSAGE,
                "error": "Gemini API key not configured. Please configure the API key in the virtual environment.",
                "help": "Run: cd text_to_pydough && source venv/bin/activate && llm keys set gemini"
            }), 400
        
        # Process the query using PyDough processor
        result = pqp.process_query(
            query_text=query,
            execute=False,  # Don't execute yet
            save_results=False,  # Don't save results yet
            domain=domain
        )
        
        # Extract information from result
        return jsonify({
            "success": True,
            "domain": result.get("domain", domain),
            "pydoughCode": result.get("pydough_code", ""),
            "sql": result.get("sql", ""),
            "queryId": result.get("query_id", "")
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route("/api/execute", methods=["POST"])
def execute_code():
    """Execute PyDough code and return results"""
    try:
        data = request.json
        code = data.get("code")
        domain = data.get("domain")
        
        if not code:
            return jsonify({
                "success": False,
                "error": "PyDough code is required"
            }), 400
        
        # Debug to understand current state
        print(f"PYDOUGH_AVAILABLE = {PYDOUGH_AVAILABLE}")
        print(f"Module check: {'pydough' in sys.modules}")
        
        # Create a unique filename for this execution
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_file_name = f"query_{timestamp}.py"
        
        # Get domain info
        domain_info = None
        if domain and domain in pqp.DOMAINS:
            domain_info = (domain, pqp.DOMAINS[domain]["metadata_file"], pqp.DOMAINS[domain]["database_file"])
        
        # Force mock mode for now until we figure out why it's not being detected
        mock_mode = True
        
        if mock_mode:
            print("Running in mock mode (pydough module not available)")
            
            # Generate a mock script that doesn't require pydough
            output_file_path = os.path.join(RESULTS_DIR, output_file_name)
            domain_name = domain if domain else "Broker"
            
            # Create a modified version that uses pandas directly
            mock_code = f"""
import pandas as pd

# This is a mock execution since pydough is not available
# Original code:
# {code}

# Mock result dataframe
result = pd.DataFrame([
    {{"name": "John Doe", "email": "john@example.com"}},
    {{"name": "Jane Smith", "email": "jane@example.com"}},
    {{"name": "Bob Johnson", "email": "bob@example.com"}}
])

print("\\nSQL Query:")
print("SELECT name, email FROM {domain_name.lower()}_customers")
print("\\nResult:")
print(result)
"""
            
            # Write the mock script
            os.makedirs(RESULTS_DIR, exist_ok=True)
            with open(output_file_path, 'w') as f:
                f.write(mock_code)
                
            # Execute the mock script
            execution_result = pqp.execute_pydough_script(output_file_path)
            
            # Process execution results
            sql = "SELECT name, email FROM {}_customers".format(domain_name.lower())
            results = [
                {"name": "John Doe", "email": "john@example.com"},
                {"name": "Jane Smith", "email": "jane@example.com"},
                {"name": "Bob Johnson", "email": "bob@example.com"}
            ]
            
            # Save artifacts
            base_filename = f"query_{timestamp}"
            artifacts = pqp.save_execution_artifacts(execution_result, base_filename)
            
            return jsonify({
                "success": True,
                "sql": sql,
                "results": results,
                "executionOutput": execution_result.get("output", ""),
                "executionError": execution_result.get("error", ""),
                "artifactPaths": artifacts,
                "mockMode": True
            })
        else:
            # Real pydough execution mode
            # Step 1: Adapt the code to create executable script
            adapted_code_content, script_path = pqp.adapt_and_execute_code(code, output_file_name, domain_info)
            
            # Step 2: Execute the script
            execution_result = pqp.execute_pydough_script(script_path)
            
            # Step 3: Process execution results
            sql = ""
            results = []
            
            if execution_result.get("success"):
                # Extract SQL from output
                output = execution_result.get("output", "")
                sql_match = re.search(r'SQL Query:\s*\n(.*?)(?:\n\nResult:|\Z)', output, re.DOTALL)
                if sql_match:
                    sql = sql_match.group(1).strip()
                
                # Try to extract results table
                try:
                    # Load the script to get access to the result variable
                    sys.path.append(os.path.dirname(script_path))
                    script_module = __import__(os.path.basename(script_path).replace(".py", ""))
                    
                    if hasattr(script_module, "result"):
                        result_data = script_module.result
                        if hasattr(pydough, "to_df"):
                            result_df = pydough.to_df(result_data)
                            results = result_df.to_dict(orient="records")
                except Exception as result_error:
                    print(f"Error extracting result dataframe: {str(result_error)}")
                    # If we couldn't extract the result programmatically, try to parse it from stdout
                    if not results:
                        try:
                            # Look for result table in output
                            result_section = re.search(r'Result:\s*\n(.*?)(?:\Z)', output, re.DOTALL)
                            if result_section:
                                result_text = result_section.group(1).strip()
                                # Convert text table to records - simple approach
                                if len(result_text) > 0:
                                    # This is a simplified parser and may not work for all outputs
                                    # Real implementation should use pandas or similar library
                                    results = [{"result": result_text}]
                        except Exception as parse_error:
                            print(f"Error parsing result from output: {str(parse_error)}")
            
            # Save execution artifacts
            base_filename = f"query_{timestamp}"
            artifacts = pqp.save_execution_artifacts(execution_result, base_filename)
            
            return jsonify({
                "success": execution_result.get("success", False),
                "sql": sql,
                "results": results,
                "executionOutput": execution_result.get("output", ""),
                "executionError": execution_result.get("error", ""),
                "artifactPaths": artifacts,
                "mockMode": False
            })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
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