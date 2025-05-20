#!/usr/bin/env python3 
# -*- coding: utf-8 -*-

"""
PyDough Query Processor

This script processes natural language queries using the Gemini 2.5 Pro LLM
to generate and execute PyDough code for a stock broker database.
"""

import csv
import os
import re
import json
import time
import pandas as pd
import subprocess
import argparse
from datetime import datetime
from tqdm import tqdm
from typing import Optional, List, Dict
import sys # Add sys import

# Make sure llm package and pydantic are installed
try:
    import llm
    from pydantic import BaseModel
    import pydough
except ImportError:
    print("Installing required packages...")
    subprocess.run(["pip", "install", "llm", "llm-gemini", "pandas", "tqdm", "pydantic", "pydough"], check=True)
    import llm
    from pydantic import BaseModel
    import pydough

# Define Pydantic model for structured LLM output
class PyDoughResponse(BaseModel):
    """Structured response from LLM."""
    code: str
    explanation: Optional[str] = None

# Define a Pydantic model for domain detection
class DomainDetection(BaseModel):
    """Structured response for domain detection."""
    domain: str
    # confidence: float = 1.0  # Temporarily commenting out
    # reasoning: Optional[str] = None # Temporarily commenting out

# Domain configuration data
DOMAINS = {
    "Broker": {
        "keywords": ["customer", "ticker", "transaction", "stock", "price", "share", "trade", "broker", "exchange"],
        "metadata_file": "data/Broker_graph.json",
        "database_file": "data/Broker.db"
    },
    "Dealership": {
        "keywords": ["car", "make", "model", "salesperson", "customer", "sale", "dealership", "inventory", "vehicle", "vin"],
        "metadata_file": "data/Dealership_graph.json",
        "database_file": "data/Dealership.db"
    },
    "DermTreatment": {
        "keywords": ["doctor", "patient", "drug", "treatment", "diagnosis", "dermatology", "medical", "clinic", "adverse", "derm"],
        "metadata_file": "data/DermTreatment_graph.json",
        "database_file": "data/DermTreatment.db"
    },
    "Ewallet": {
        "keywords": ["user", "transaction", "merchant", "wallet", "balance", "payment", "coupon", "ewallet", "digital", "finance"],
        "metadata_file": "data/Ewallet_graph.json",
        "database_file": "data/Ewallet.db"
    },
    "TPCH": {
        "keywords": ["supplier", "order", "lineitem", "customer", "nation", "region", "part", "partsupp", "tpch"],
        "metadata_file": "data/tpch_demo_graph.json",
        "database_file": "data/tpch.db"
    }
    # Can add more domains as needed
}

def check_requirements():
    """Check that all required files and dependencies are available."""
    print("\n--- Checking Requirements ---")
    
    # Check required files
    required_files = [
        'queries.csv', 
        'cheatsheet.md', 
        'data/broker.md', # Changed from defog_broker.md in root
        'data/Broker_graph.json', 
        'data/Broker.db'
    ]
    # We should also ideally check for the .md files for other domains if they are considered essential.
    # For now, just ensuring broker.md is checked at its new location.

    missing_files = []

    for file in required_files:
        if not os.path.exists(file):
            missing_files.append(file)
            
    if missing_files:
        print(f"❌ Missing required files: {', '.join(missing_files)}")
        print("Please ensure these files are present in the correct locations.")
        return False
    else:
        print("✅ All required files found")
    
    # Configure gemini-2.5-pro-preview-05-06 model
    try:
        model = llm.get_model("gemini-2.5-pro-05-06")
        print("✅ Successfully loaded Gemini model")
    except Exception as e:
        print(f"❌ Error loading Gemini model: {str(e)}")
        print("Make sure you've set your API key with: llm keys set gemini")
        return False
    
    return True

def get_queries(category=None):
    """
    Read queries.csv and optionally filter by category.
    Returns all queries if category is None, or only queries matching the specified category.
    """
    all_queries = []
    categories = set()
    category_queries = {}
    
    try:
        # Try multiple encodings to handle potential issues
        for encoding in ['utf-8', 'utf-8-sig', 'latin-1']:
            try:
                with open('queries.csv', 'r', encoding=encoding) as f:
                    reader = csv.DictReader(f)
                    fieldnames = reader.fieldnames
                    if not fieldnames:
                        continue
                        
                    # Check for Category column with case insensitivity
                    category_col = None
                    for col in fieldnames:
                        if col.lower() == 'category':
                            category_col = col
                            break
                    
                    if not category_col:
                        continue
                        
                    # Reset file pointer and read rows
                    f.seek(0)
                    reader = csv.DictReader(f)
                    rows = list(reader)
                    
                    # Process all rows
                    for row in rows:
                        cat = row[category_col]
                        query = row.get('Query')
                        if not query:
                            continue
                            
                        # Store in overall list
                        all_queries.append(query)
                        
                        # Track categories and queries by category
                        categories.add(cat)
                        if cat not in category_queries:
                            category_queries[cat] = []
                        category_queries[cat].append(query)
                    
                    # If we got here with data, we succeeded
                    if all_queries:
                        break
            except Exception as inner_e:
                print(f"Attempt with {encoding} encoding failed: {str(inner_e)}")
                continue
        
        # If specific category requested, return just those queries
        if category:
            result = category_queries.get(category, [])
            print(f"Found {len(result)} queries for category '{category}'")
            return result
        
        # Otherwise return all queries
        print(f"Found {len(all_queries)} queries across {len(categories)} categories")
        print(f"Categories: {', '.join(sorted(categories))}")
        return all_queries
        
    except Exception as e:
        print(f"❌ Error reading queries.csv: {str(e)}")
        return []

def read_file_content(file_path):
    """Read the content of a file."""
    try:
        with open(file_path, 'r') as f:
            return f.read()
    except Exception as e:
        print(f"❌ Error reading {file_path}: {str(e)}")
        return ""

def keyword_based_detect_domain(query_text):
    """
    Detect the domain/database schema using keyword matching.
    This is a fallback method used when LLM detection fails.
    Returns a tuple of (domain_name, metadata_file, database_file)
    """
    # Convert query to lowercase for case-insensitive matching
    query_lower = query_text.lower()
    
    # Count occurrences of keywords for each domain
    domain_scores = {}
    for domain, config in DOMAINS.items():
        score = 0
        for keyword in config["keywords"]:
            if keyword.lower() in query_lower:
                score += 1
        domain_scores[domain] = score
    
    # Get domain with highest score, default to Broker if no matches
    if not domain_scores or max(domain_scores.values()) == 0:
        print("⚠️ Could not detect domain from query, defaulting to Broker")
        selected_domain = "Broker"
    else:
        selected_domain = max(domain_scores.items(), key=lambda x: x[1])[0]
    
    # Get metadata and database files for selected domain
    selected_config = DOMAINS[selected_domain]
    
    print(f"🔍 Detected domain (keyword-based): {selected_domain}")
    return (
        selected_domain,
        selected_config["metadata_file"],
        selected_config["database_file"]
    )

def detect_domain_with_llm(query_text):
    """
    Detect domain using LLM with structured output.
    Returns a tuple of (domain_name, metadata_file, database_file)
    """
    try:
        # Use gemini-2.0-flash for efficient domain detection
        model = llm.get_model("gemini-2.0-flash")
        
        # Build domain list for prompt
        domain_list = "\n".join([f"{i+1}. {domain} - {', '.join(config['keywords'][:5])}" 
                              for i, (domain, config) in enumerate(DOMAINS.items())])
        
        prompt = f"""
Identify which database domain this query is asking about:
"{query_text}"

Available domains:
{domain_list}

Return the domain name that best matches the query.
"""
        print(f"[Domain Detection LLM Prompt]:\n{prompt}\n") # Log the prompt
        # Get structured response
        response = model.prompt(prompt, schema=DomainDetection, temperature=0.01)
        response_text = response.text()
        print(f"[Domain Detection LLM Raw Response]: {response_text}") # Log raw response
        data = json.loads(response_text)
        
        detected_domain = data["domain"]
        confidence = data.get("confidence", 0.0)
        reasoning = data.get("reasoning", "")
        print(f"[Domain Detection Parsed LLM Response]: Domain='{detected_domain}', Confidence={confidence}, Reasoning='{reasoning}'") # Log parsed
        
        # Check if detected domain exists in our configuration
        if detected_domain in DOMAINS:
            print(f"🔍 Detected domain (LLM): {detected_domain} (confidence: {confidence:.2f})")
            if reasoning:
                print(f"   Reasoning: {reasoning}")
                
            return (
                detected_domain,
                DOMAINS[detected_domain]["metadata_file"],
                DOMAINS[detected_domain]["database_file"]
            )
        else:
            print(f"⚠️ LLM detected unknown domain: '{detected_domain}', falling back to keyword matching")
            return keyword_based_detect_domain(query_text)
            
    except Exception as e:
        print(f"⚠️ LLM domain detection failed: {str(e)}, falling back to keyword matching")
        return keyword_based_detect_domain(query_text)

def detect_domain(query_text):
    """
    Main domain detection function that tries LLM first, then falls back to keyword matching.
    Returns a tuple of (domain_name, metadata_file, database_file)
    """
    return detect_domain_with_llm(query_text)

def create_prompt(query, cheatsheet_content, schema_content, domain_name="Broker"):
    """Create a prompt for the LLM with examples."""
    
    # --- Add known collections based on domain --- 
    collections_info = ""
    if domain_name in DOMAINS:
        # Basic collections & key properties (can be refined)
        if domain_name == "TPCH":
            collections_info = (
                "# Known Collections in TPCH (with example properties):\n"
                "#   orders (key, customer_key, order_status, total_price, order_date, lines: [line])\n"
                "#   lines (order_key, part_key, supplier_key, line_number, quantity, extended_price, discount, tax)\n"
                "#   suppliers (key, name, nation_key, account_balance)\n"
                "#   customers (key, name, nation_key, account_balance, market_segment)\n"
                "#   nations (key, name, region_key)\n"
                "#   regions (key, name)\n"
                "#   parts (key, name, manufacturer, brand, type, size, retail_price)\n"
                "#   supply_records (part_key, supplier_key, available_quantity, supply_cost)"
            )
        elif domain_name == "Broker":
             collections_info = (
                 "# Known Collections in Broker (with example properties):\n"
                 "#   customer (customer_id, name, email)\n"
                 "#   transaction (transaction_id, customer_id, ticker, type, shares, price_per_share, timestamp)\n"
                 "#   stock (ticker, company_name, sector)\n"
                 "#   price (ticker, timestamp, price)"
             )
        # Add other domains as needed
        
    prompt = f"""
# Task: Convert a natural language query into PyDough code for a {domain_name} database

# Domain Information
Current Domain: {domain_name}
{collections_info}

# User Query
{query}

# {domain_name} Schema Information
{schema_content} # This will be empty if data/{domain_name}.md is missing

# PyDough Cheatsheet
{cheatsheet_content}

# Example 1: List all records from a collection
```python
result = {domain_name}.YourCollectionName.CALCULATE(
    # Select all fields using * or specify field names:
    # field_one, field_two 
    * 
)
```

# Example 2: Filter records from a collection by a condition
```python
result = {domain_name}.YourCollectionName.WHERE(
    # Example condition: field_name == "some_value"
    # More complex conditions can be built using AND, OR, etc.
    your_field_name == "example_value" 
).CALCULATE(
    # Specify the field names you want to retrieve:
    specific_field_name_1, 
    specific_field_name_2 
)
```

# Your task:
Given the user query, schema information, and PyDough cheatsheet above, create PyDough code that correctly answers the query.
Return ONLY Python code that produces the correct result as a variable named 'result'.
DON'T include any explanations or comments - just provide the working PyDough code.
"""
    return prompt

def extract_pydough_code(response):
    """
    Extract PyDough code from LLM response.
    This function is kept for backward compatibility but is no longer used
    when structured output (schema parameter) is in use.
    """
    # Look for Python code blocks in the response
    pattern = r'```(?:python)?\s*([\s\S]*?)\s*```'
    matches = re.findall(pattern, str(response))
    
    if matches:
        code = matches[0].strip()
        # Ensure the code assigns to a variable named 'result'
        if not re.search(r'\bresult\s*=', code):
            # If not found, wrap the code with result assignment
            if code.startswith('return '):
                code = code.replace('return ', 'result = ', 1)
            else:
                code = f"result = {code}"
        return code
    
    # Fallback: If no code block found, look for any Python-like code
    code_like_pattern = r'result\s*=\s*[^;]+'
    matches = re.findall(code_like_pattern, str(response))
    if matches:
        return matches[0].strip()
    
    return None

def review_code_with_llm(code, model=None):
    """Send the generated code to LLM for review and improvement."""
    if model is None:
        model = llm.get_model("gemini-2.5-pro-preview-05-06")
    
    # Define a Pydantic model for code review response
    class CodeReviewResponse(BaseModel):
        reviewed_code: str
    
    prompt = f"""
Review and improve this PyDough code to ensure it is syntactically correct and follows best practices.
Fix any potential issues and return only the corrected code.

```python
{code}
```

Ensure the code:
1. Uses proper PyDough syntax
2. Has correct property and collection references
3. Assigns the final result to a variable named 'result'
4. Has no syntax errors
"""
    
    print("⏳ Sending code to LLM for review and improvement...")
    try:
        # Use schema parameter for structured output
        response = model.prompt(prompt, schema=CodeReviewResponse, temperature=0.01)
        review_data = json.loads(response.text())
        clean_response = review_data["reviewed_code"]
        
        # Ensure result assignment
        if not re.search(r'\bresult\s*=', clean_response):
            if clean_response.startswith('return '):
                clean_response = clean_response.replace('return ', 'result = ', 1)
            else:
                clean_response = f"result = {clean_response}"
        
        print("✅ Code review complete")
        return clean_response
    except Exception as e:
        # Fallback to regex extraction if structured output fails
        print(f"⚠️ Structured output failed for code review: {str(e)}")
        print("Falling back to regex extraction...")
        response_text = str(model.prompt(prompt, temperature=0.01))
        return extract_pydough_code(response_text) or code

def adapt_and_execute_code(pydough_code, output_file_name, domain_info=None):
    """Adapt and execute the PyDough code."""
    
    # If domain_info not provided, use default Broker
    if domain_info is None:
        domain_name = "Broker"
        metadata_file = "data/Broker_graph.json"
        database_file = "data/Broker.db"
    else:
        domain_name, metadata_file, database_file = domain_info
    
    # Ensure results directory exists
    os.makedirs("results", exist_ok=True)
    
    # Construct the full path for the output file inside the results directory
    output_file_path = os.path.join("results", output_file_name)

    # Create a modified version of test.py with the new pydough code
    # Get the DataFrame once
    # For direct script output inspection
    # Ensure PD_JSON is reliably generated if df_result is a DataFrame
    # Use date_format and default_handler for better serialization
    # Print error to stdout as well
    # Indicate PD_JSON was attempted but failed
    # If not a DataFrame or empty, or if result itself is simple type
    # print(result) # Or handle non-DataFrame results appropriately
    # Indicate no DataFrame for PD_JSON
    adapted_code = f"""
import pydough
import pandas as pd # Ensure pandas is imported
from pydough import init_pydough_context

# Load metadata and connect to database
pydough.active_session.load_metadata_graph("{metadata_file}", "{domain_name}")
pydough.active_session.connect_database("sqlite", database="{database_file}")

@init_pydough_context(pydough.active_session.metadata)
def func():
    # Generated PyDough code
    {pydough_code}
    return result

result_val = func()
# print(f"[DEBUG ADAPT] Type of result_val: {{type(result_val)}}") # DEBUG PRINT
# print(f"[DEBUG ADAPT] result_val itself: {{str(result_val)[:500]}}") # DEBUG PRINT (first 500 chars)

df_result = pydough.to_df(result_val)
# print(f"[DEBUG ADAPT] Type of df_result after pydough.to_df: {{type(df_result)}}") # DEBUG PRINT

print("\\nSQL Query:")
print(pydough.to_sql(result_val))
print("\\nResult:")
if isinstance(df_result, pd.DataFrame):
    # print(f"[DEBUG ADAPT] df_result is a DataFrame. Is it empty? {{df_result.empty}}") # DEBUG PRINT
    if not df_result.empty:
        # print("[DEBUG ADAPT] df_result.head():") # DEBUG PRINT
        print(df_result.head())
    print(df_result.head(10))
else:
    # print(f"[DEBUG ADAPT] df_result is NOT a DataFrame.") # DEBUG PRINT
    print(df_result)

if isinstance(df_result, pd.DataFrame) and not df_result.empty:
    try:
        pd_json_str = df_result.to_json(orient="split", date_format='iso', default_handler=str)
        print("PD_JSON::" + pd_json_str)
    except Exception as e:
        print(f"Error serializing DataFrame to PD_JSON: {{e}}")
        print("PD_JSON::null")
else:
    print("PD_JSON::null")
print("PD_JSON_END") # Add a marker for easier regex parsing
"""

    # Write to Python file in the results directory
    with open(output_file_path, 'w') as f:
        f.write(adapted_code)
    
    print(f"✅ Generated PyDough code written to {output_file_path}")
    
    return adapted_code, output_file_path # Return the full path

def execute_pydough_script(script_path):
    """Execute the generated Python file and capture output, using the correct Python executable."""
    try:
        python_executable = sys.executable # Get path to python from current venv
        print(f"⏳ Executing {script_path}... using {python_executable}")
        print(f"Command: {python_executable} {script_path}")
        
        process = subprocess.Popen(
            [python_executable, script_path], 
            stdout=subprocess.PIPE, 
            stderr=subprocess.PIPE,
            text=True
        )
        
        stdout, stderr = process.communicate(timeout=60)

        # print("[DEBUG EXECUTE] Captured stdout (first 1000 chars):")
        # print(stdout[:1000]) # DEBUG PRINT STDOUT

        if process.returncode == 0:
            print(f"✅ Execution successful")
            raw_pandas_json_string = None

            match = re.search(r"PD_JSON::(.*)PD_JSON_END", stdout, re.DOTALL)
            
            if match:
                # print("[DEBUG EXECUTE] Regex Matched!")
                captured_group = match.group(1)
                # print("[DEBUG EXECUTE] Regex captured group (raw first 500 chars):")
                # print(captured_group[:500]) # DEBUG PRINT CAPTURED GROUP
                json_str = captured_group.strip()
                # print("[DEBUG EXECUTE] JSON string after strip (first 500 chars):")
                # print(json_str[:500]) # DEBUG PRINT JSON_STR
                if json_str != "null":
                    raw_pandas_json_string = json_str
                # else:
                    # print("[DEBUG EXECUTE] json_str was literally 'null', so raw_pandas_json_string remains None.")
            # else:
                # print("[DEBUG EXECUTE] Regex did NOT Match.")

            # print("[DEBUG EXECUTE] Final raw_pandas_json_string before return (first 500 chars):")
            # print(str(raw_pandas_json_string)[:500]) # DEBUG PRINT FINAL VALUE

            return {
                'success': True,
                'output': stdout, # Full stdout for debugging / other parsing
                'pandas_df_json_string': raw_pandas_json_string # This is the critical string for frontend
            }
        else:
            print(f"❌ Execution failed with return code {process.returncode}")
            print("Error:")
            print(stderr)
            
            if stdout:
                print("\nPartial output before error:")
                print(stdout)
                
            return {
                'success': False, 
                'error': stderr,
                'partial_output': stdout if stdout else None,
                'returncode': process.returncode
            }
            
    except subprocess.TimeoutExpired:
        process.kill()
        stdout, stderr = process.communicate()
        print("❌ Execution timed out after 60 seconds")
        return {
            'success': False, 
            'error': 'Execution timed out after 60 seconds',
            'partial_output': stdout.strip() if stdout else None,
            'partial_error': stderr.strip() if stderr else None
        }
    except FileNotFoundError:
        error_msg = f"❌ Python interpreter not found at {sys.executable} or script file {script_path} doesn't exist"
        print(error_msg)
        return {'success': False, 'error': error_msg}
    except Exception as e:
        error_msg = f"❌ Error executing script: {str(e)}"
        print(error_msg)
        return {'success': False, 'error': error_msg}

# Helper function to save execution artifacts
def save_execution_artifacts(execution_result, base_filename):
    """Saves execution output (stdout, stderr, SQL) to files."""
    os.makedirs("results", exist_ok=True)

    if not execution_result:
        print("ℹ️ No execution result to save.")
        return

    # Save SQL query and full output if execution was successful
    if execution_result.get("success") and "output" in execution_result:
        output = execution_result["output"]
        
        # Try to extract SQL query
        sql_match = re.search(r'SQL Query:\s*\n(.*?)(?:\n\nResult:|\Z)', output, re.DOTALL)
        if sql_match:
            sql_query = sql_match.group(1).strip()
            sql_file_path = os.path.join("results", f"sql_{base_filename}.sql")
            with open(sql_file_path, 'w') as f:
                f.write(sql_query)
            print(f"💾 SQL query saved to {sql_file_path}")
        
        # Save full output
        output_text_file_path = os.path.join("results", f"output_{base_filename}.txt")
        with open(output_text_file_path, 'w') as f:
            f.write(output)
        print(f"💾 Execution output saved to {output_text_file_path}")
    
    # If execution failed, save error
    elif "error" in execution_result:
        error_message = execution_result["error"]
        if execution_result.get("partial_output"):
            error_message += "\n\n--- Partial Output Before Error ---\n" + execution_result["partial_output"]
        
        error_file_path = os.path.join("results", f"error_{base_filename}.txt")
        with open(error_file_path, 'w') as f:
            f.write(error_message)
        print(f"💾 Execution error saved to {error_file_path}")
    else:
        print("ℹ️ Execution result present, but no standard output or error field to save.")

def process_query(query_text, execute=False, save_results=True, model=None, use_code_review=False, domain=None, history: Optional[List[Dict[str, str]]] = None):
    """Process a single query through the LLM, potentially using conversation history."""
    print(f"\nProcessing query: {query_text}")
    if history:
        print(f"Using conversation history with {len(history)} turns.")
    print("-" * 80)

    # If model not provided, get it
    if model is None:
        model_name = "gemini-2.5-pro-preview-05-06"
        model = llm.get_model(model_name)

    result_data = {
        "query": query_text,
        "timestamp": datetime.now().isoformat(),
        "execution": None,
        "domain": "Unknown",
        "history_used": bool(history)
    }

    adapted_code_content = None
    domain_name = "Unknown"
    pydough_code = None
    explanation = None

    try:
        # 1. Detect domain (based on current query)
        if domain is None:
            domain_info = detect_domain(query_text)
        else:
            if domain in DOMAINS:
                domain_info = (domain, DOMAINS[domain]["metadata_file"], DOMAINS[domain]["database_file"])
            else:
                raise ValueError(f"Unknown domain: {domain}")
        domain_name, metadata_file, database_file = domain_info
        result_data["domain"] = domain_name

        # 2. Read contextual files
        cheatsheet_content = read_file_content('cheatsheet.md')
        schema_content = ""
        schema_file_path = os.path.join("data", f"{domain_name.lower()}.md")

        print(f"INFO: Attempting to load schema description file: {schema_file_path}")
        if os.path.exists(schema_file_path):
            schema_content = read_file_content(schema_file_path)
            if schema_content:
                print(f"INFO: Successfully loaded schema description from {schema_file_path}")
            else:
                print(f"WARNING: Schema file {schema_file_path} was found but is empty.")
        else:
            print(f"WARNING: Schema description file not found: {schema_file_path}. Proceeding without specific schema markdown.")

        # 3. Generate PyDough code
        print("⏳ Generating PyDough code...")
        if history:
            # --- Format History into Prompt --- 
            try:
                history_string = ""
                for turn in history:
                    role = turn.get('role', 'unknown').capitalize()
                    content = turn.get('content', '')
                    history_string += f"{role}: {content}\\n\\n"
                
                # Construct the prompt with history
                # Use the standard prompt creation but prepend the history
                base_prompt_structure = create_prompt(query_text, cheatsheet_content, schema_content, domain_name)
                # A simple way to inject history - might need refinement based on how create_prompt is structured
                # Assuming create_prompt starts with the task description
                prompt_parts = base_prompt_structure.split("# User Query", 1)
                if len(prompt_parts) == 2:
                   task_description = prompt_parts[0]
                   rest_of_prompt = prompt_parts[1].split(query_text, 1)[1] # Get part after original query
                   full_prompt_with_history = f"{task_description}# Conversation History\n{history_string}# Current User Query\n{query_text}{rest_of_prompt}"
                else: # Fallback if split fails
                    print("⚠️ Could not inject history smoothly, prepending instead.")
                    full_prompt_with_history = f"# Conversation History\n{history_string}\n---\n\n{base_prompt_structure}"
                
                # Call model.prompt with the combined history + current query prompt
                response = model.prompt(full_prompt_with_history, schema=PyDoughResponse, temperature=0.01)
                
                # --- DETAILED INSPECTION OF RESPONSE OBJECT ---
                # print(f"[DEBUG] Type of response object: {type(response)}")
                # print(f"[DEBUG] Attributes of response object: {dir(response)}")
                # try:
                    # print(f"[DEBUG] response.code: {getattr(response, 'code', 'N/A')}")
                    # print(f"[DEBUG] response.explanation: {getattr(response, 'explanation', 'N/A')}")
                    # if hasattr(response, 'data'):
                        # print(f"[DEBUG] response.data: {response.data}")
                    # if hasattr(response, 'dict') and callable(response.dict):
                        # print(f"[DEBUG] response.dict(): {response.dict()}")
                    # if hasattr(response, 'model_dump') and callable(response.model_dump): # For Pydantic v2
                        # print(f"[DEBUG] response.model_dump(): {response.model_dump()}")
                # except Exception as inspect_e:
                    # print(f"[DEBUG] Error during response inspection: {inspect_e}")
                # --- END DETAILED INSPECTION ---
                
                pydough_code = None
                explanation = None
                raw_response_text = None
                
                try:
                    if hasattr(response, 'text') and callable(response.text):
                        raw_response_text = response.text()
                    elif hasattr(response, 'content'):
                        raw_response_text = str(response.content)
                    else:
                        raw_response_text = str(response)
                except Exception as log_e:
                    raw_response_text = f"[Error getting raw text: {log_e}]"
                
                # print(f"[DEBUG] Raw response text: {raw_response_text}")

                if raw_response_text and '{' in raw_response_text:
                    try:
                        json_text = raw_response_text
                        if not json_text.strip().startswith('{'):
                            json_start = json_text.find('{')
                            json_text = json_text[json_start:]
                        
                        parsed_json = json.loads(json_text)
                        # print(f"[DEBUG] Successfully parsed raw response text as JSON: {parsed_json}")
                        pydough_code = parsed_json.get("code")
                        explanation = parsed_json.get("explanation")
                        
                        # if pydough_code:
                            # print(f"[DEBUG] Successfully extracted code from parsed JSON")
                    except json.JSONDecodeError as e:
                        # print(f"[DEBUG] Failed to parse raw text as JSON: {e}")
                        pass # Continue to other approaches
                
                if not pydough_code and hasattr(response, 'response_json'):
                    # print(f"[DEBUG] response.response_json found, type: {type(response.response_json)}, value: {response.response_json}")
                    try:
                        if isinstance(response.response_json, dict):
                            pydough_code = response.response_json.get("code")
                            explanation = response.response_json.get("explanation")
                        elif response.response_json is not None:
                            try:
                                if isinstance(response.response_json, str):
                                    parsed_json = json.loads(response.response_json)
                                    pydough_code = parsed_json.get("code")
                                    explanation = parsed_json.get("explanation")
                            except json.JSONDecodeError:
                                # print("[DEBUG] response.response_json is a string but not valid JSON")
                                pass
                    except Exception as e:
                        # print(f"[DEBUG] Error accessing response.response_json: {e}")
                        pass
                
                if not pydough_code:
                    if hasattr(response, 'json') and callable(response.json):
                        try:
                            json_data = response.json()
                            # print(f"[DEBUG] response.json() returned: {json_data}")
                            if isinstance(json_data, dict):
                                pydough_code = json_data.get("code")
                                explanation = json_data.get("explanation")
                        except Exception as e:
                            # print(f"[DEBUG] Error calling response.json(): {e}")
                            pass
                    
                    if not pydough_code and hasattr(response, 'code'):
                        pydough_code = response.code
                    if not explanation and hasattr(response, 'explanation'):
                        explanation = response.explanation
                    
                    if not pydough_code and raw_response_text:
                        # print("[DEBUG] Attempting regex extraction as last resort")
                        code_match = re.search(r'"code"\\s*:\\s*"(.*?)"(?:,|\\})', raw_response_text, re.DOTALL)
                        if code_match:
                            extracted_code = code_match.group(1)
                            extracted_code = extracted_code.replace("\\\\n", "\\n").replace('\\\\"', '"').replace("\\\\\\\\", "\\\\")
                            pydough_code = extracted_code
                            # print(f"[DEBUG] Extracted code via regex: {pydough_code[:50]}...")
                
                # print(f"[DEBUG] Final pydough_code: {pydough_code if pydough_code else 'None'}")
                
                result_data["llm_response"] = f"Structured response (stateless): {raw_response_text}"
            
            except Exception as e:
                print(f"⚠️ Error using formatted history prompt: {str(e)}")
                print("⚠️ Falling back to stateless prompt...")
                # Fallback to stateless mode if history formatting/call fails
                history = None # Ensure the stateless block runs

        if not history: # Runs if history is None initially OR if history prompt failed
             # --- Stateless Prompt (No History or Fallback) ---
             try:
                 prompt = create_prompt(query_text, cheatsheet_content, schema_content, domain_name)
                 response = model.prompt(prompt, schema=PyDoughResponse, temperature=0.01) # Gets structured response object
                 
                 # --- DETAILED INSPECTION OF RESPONSE OBJECT ---
                 # print(f"[DEBUG] Type of response object: {type(response)}")
                 # print(f"[DEBUG] Attributes of response object: {dir(response)}")
                 # try:
                     # print(f"[DEBUG] response.code: {getattr(response, 'code', 'N/A')}")
                     # print(f"[DEBUG] response.explanation: {getattr(response, 'explanation', 'N/A')}")
                     # if hasattr(response, 'data'):
                         # print(f"[DEBUG] response.data: {response.data}")
                     # if hasattr(response, 'dict') and callable(response.dict):
                         # print(f"[DEBUG] response.dict(): {response.dict()}")
                     # if hasattr(response, 'model_dump') and callable(response.model_dump): # For Pydantic v2
                         # print(f"[DEBUG] response.model_dump(): {response.model_dump()}")
                 # except Exception as inspect_e:
                     # print(f"[DEBUG] Error during response inspection: {inspect_e}")
                 # --- END DETAILED INSPECTION ---

                 pydough_code = None
                 explanation = None
                 raw_response_text = None
                 
                 try:
                     if hasattr(response, 'text') and callable(response.text):
                         raw_response_text = response.text()
                     elif hasattr(response, 'content'):
                         raw_response_text = str(response.content)
                     else:
                         raw_response_text = str(response)
                 except Exception as log_e:
                     raw_response_text = f"[Error getting raw text: {log_e}]"
                 
                 # print(f"[DEBUG] Raw response text: {raw_response_text}")

                 if raw_response_text and '{' in raw_response_text:
                     try:
                         json_text = raw_response_text
                         if not json_text.strip().startswith('{'):
                             json_start = json_text.find('{')
                             json_text = json_text[json_start:]
                         
                         parsed_json = json.loads(json_text)
                         # print(f"[DEBUG] Successfully parsed raw response text as JSON: {parsed_json}")
                         pydough_code = parsed_json.get("code")
                         explanation = parsed_json.get("explanation")
                         
                         # if pydough_code:
                             # print(f"[DEBUG] Successfully extracted code from parsed JSON")
                     except json.JSONDecodeError as e:
                         # print(f"[DEBUG] Failed to parse raw text as JSON: {e}")
                         pass # Continue to other approaches
                 
                 if not pydough_code and hasattr(response, 'response_json'):
                     # print(f"[DEBUG] response.response_json found, type: {type(response.response_json)}, value: {response.response_json}")
                     try:
                         if isinstance(response.response_json, dict):
                             pydough_code = response.response_json.get("code")
                             explanation = response.response_json.get("explanation")
                         elif response.response_json is not None:
                             try:
                                 if isinstance(response.response_json, str):
                                     parsed_json = json.loads(response.response_json)
                                     pydough_code = parsed_json.get("code")
                                     explanation = parsed_json.get("explanation")
                             except json.JSONDecodeError:
                                 # print("[DEBUG] response.response_json is a string but not valid JSON")
                                 pass
                     except Exception as e:
                         # print(f"[DEBUG] Error accessing response.response_json: {e}")
                         pass
                
                 if not pydough_code:
                     if hasattr(response, 'json') and callable(response.json):
                         try:
                             json_data = response.json()
                             # print(f"[DEBUG] response.json() returned: {json_data}")
                             if isinstance(json_data, dict):
                                 pydough_code = json_data.get("code")
                                 explanation = json_data.get("explanation")
                         except Exception as e:
                             # print(f"[DEBUG] Error calling response.json(): {e}")
                             pass
                     
                     if not pydough_code and hasattr(response, 'code'):
                         pydough_code = response.code
                     if not explanation and hasattr(response, 'explanation'):
                         explanation = response.explanation
                 
                 if not pydough_code and raw_response_text:
                     # print("[DEBUG] Attempting regex extraction as last resort")
                     code_match = re.search(r'"code"\\s*:\\s*"(.*?)"(?:,|\\})', raw_response_text, re.DOTALL)
                     if code_match:
                         extracted_code = code_match.group(1)
                         extracted_code = extracted_code.replace("\\\\n", "\\n").replace('\\\\"', '"').replace("\\\\\\\\", "\\\\")
                         pydough_code = extracted_code
                         # print(f"[DEBUG] Extracted code via regex: {pydough_code[:50]}...")
                 
                 # print(f"[DEBUG] Final pydough_code: {pydough_code if pydough_code else 'None'}")
                 
                 result_data["llm_response"] = f"Structured response (stateless): {raw_response_text}"
             except Exception as e:
                 print(f"⚠️ Structured output failed (stateless): {str(e)}")
                 print("Falling back to regex extraction...")
                 prompt = create_prompt(query_text, cheatsheet_content, schema_content, domain_name)
                 response = model.prompt(prompt, temperature=0.01)
                 result_data["llm_response"] = str(response)
                 print("\n🤖 LLM Response (unstructured):")
                 print(response)
                 pydough_code = extract_pydough_code(str(response))

        # Update results with generated code and explanation (if any)
        result_data["pydough_code"] = pydough_code
        if explanation:
            result_data["explanation"] = explanation

        # 4. Post-processing, Execution, Saving (remains largely the same)
        if pydough_code:
            print("\n📄 Generated PyDough Code:")
            print(pydough_code)

            # Optional code review
            if use_code_review:
                # Code review likely shouldn't use conversation history directly
                # Pass the specific model instance if needed
                review_model = llm.get_model(model_name) # Get a fresh instance if needed
                reviewed_code = review_code_with_llm(pydough_code, model=review_model) 
                if reviewed_code and reviewed_code != pydough_code:
                    print("\n📝 Improved PyDough Code after Review:")
                    print(reviewed_code)
                    pydough_code = reviewed_code
                    result_data["reviewed_code"] = reviewed_code

            # Adapt code for execution
            print("\n🔄 Adapting and executing PyDough code for domain: {domain_name}...")
            adapted_code_content, script_path = adapt_and_execute_code(pydough_code, f"{domain_name}_query_{time.time()}.py", domain_info)
            execution_result = execute_pydough_script(script_path)
            
            current_execution_details = {
                "success": execution_result.get("success", False),
                "output": execution_result.get("output"),
                "error": execution_result.get("error"),
                "result_data": {} 
            }

            # Ensure pandas_df_json is robustly handled
            raw_json_str = execution_result.get("pandas_df_json_string")
            if raw_json_str: # True if raw_json_str is a non-empty string
                current_execution_details["result_data"]["pandas_df_json"] = raw_json_str
            else: # Covers cases where raw_json_str is None (e.g. from PD_JSON::null) or "" (e.g. from PD_JSON:: <empty>)
                current_execution_details["result_data"]["pandas_df_json"] = None
            
            result_data["execution"] = current_execution_details

            if save_results:
                # Save execution artifacts using the helper function
                save_execution_artifacts(execution_result, f"{domain_name}_query_{time.time()}")

        else:
            print("\n❌ No PyDough code found in the response")

    except Exception as e:
        print(f"\n❌ Error processing query: {str(e)}")
        result_data["error"] = str(e)
        # Ensure 'success' is false if an error occurred during processing,
        # even if execution wasn't the part that failed.
        if "execution" not in result_data or not result_data["execution"]:
            result_data["execution"] = {"success": False, "error": str(e), "result_data": {}}
        else:
            # If execution details exist, ensure its success is false and error is set
            current_exec = result_data["execution"]
            current_exec["success"] = False
            if "error" not in current_exec or not current_exec["error"]: # Don't overwrite existing specific error
                 current_exec["error"] = str(e)
            result_data["execution"] = current_exec

    # 5. Save results if requested
    if save_results:
        os.makedirs("results", exist_ok=True)
        
        # Use the generated query_id if available, otherwise create a fallback name
        base_filename = result_data.get("query_id", f"unknown_{datetime.now().strftime('%Y%m%d_%H%M%S')}")

        # Save comprehensive JSON results
        result_file_path = os.path.join("results", f"query_result_{base_filename}.json")
        with open(result_file_path, 'w') as f:\
            # Use default=str to handle potential non-serializable types like datetime
            json.dump(result_data, f, indent=2, default=str) 
        print(f"\n💾 JSON results saved to {result_file_path}")

        # Save execution artifacts using the helper function
        if execute and result_data.get("execution"):
            save_execution_artifacts(result_data["execution"], base_filename)

        if result_data.get("output_file") and os.path.exists(result_data.get("output_file")):
             print(f"ℹ️ Generated Python code is at {result_data['output_file']}")
        elif result_data.get("adapted_code"):
             print(f"⚠️ Generated Python code was created but not found at the expected path: {result_data.get('output_file')}")

    # Prepare and return the response
    if not execute:
        # If execution was not requested, just return the generated code
        return {
            "success": True if pydough_code else False, # Success of generation
            "query": query_text,
            "domain": domain_name,
            "pydough_code": pydough_code,
            "pydoughCode": pydough_code,
            "explanation": explanation,
            "timestamp": result_data["timestamp"], # Use timestamp from result_data
        }
    else:
        # If execution was requested, include execution results
        final_execution_details = result_data.get("execution")

        if not final_execution_details:
            # This case can happen if pydough_code generation failed and execute was True.
            final_execution_details = {
                "success": False,
                "error": result_data.get("error", "PyDough code generation failed, so execution was not attempted."),
                "output": None,
                "result_data": {}
            }
        # Ensure 'success' key exists, default to False if not explicitly set by execution logic
        # (though prior logic should set it).
        if "success" not in final_execution_details:
            final_execution_details["success"] = False
            if "error" not in final_execution_details: # Add a generic error if none exists
                final_execution_details["error"] = "Execution success status was not explicitly set."

        return {
            # Overall success of the operation: code must be generated, and if execution happened, it must be successful.
            "success": bool(pydough_code) and final_execution_details.get("success", False),
            "query": query_text,
            "domain": domain_name,
            "pydough_code": pydough_code,
            "pydoughCode": pydough_code, # Frontend expects this
            "explanation": explanation,
            "timestamp": result_data["timestamp"], # Use timestamp from result_data
            "execution": final_execution_details
        }

def process_all_queries(queries, max_queries=None, execute=False, save_results=True, use_code_review=False, domain=None):
    """Process multiple queries."""
    results = []
    summary = {
        "total": 0,
        "successful_generation": 0,
        "successful_execution": 0,
        "failed": 0
    }
    
    if max_queries is not None:
        queries = queries[:max_queries]
    
    # Get the model once for all queries
    model = llm.get_model("gemini-2.5-pro-preview-05-06")
    
    print(f"⏳ Processing {len(queries)} queries...")
    
    for i, query in enumerate(tqdm(queries)):
        print(f"\n--- Query {i+1}/{len(queries)} ---")
        result = process_query(query, execute=execute, save_results=save_results, model=model, use_code_review=use_code_review, domain=domain)
        results.append(result)
        
        # Update summary statistics
        summary["total"] += 1
        if "pydough_code" in result and result["pydough_code"]:
            summary["successful_generation"] += 1
        else:
            summary["failed"] += 1
            
        if "execution" in result and result["execution"] and result["execution"].get("success", False):
            summary["successful_execution"] += 1
    
    # Print summary
    print("\n=== Processing Summary ===")
    print(f"Total queries processed: {summary['total']}")
    print(f"Successful code generation: {summary['successful_generation']} ({summary['successful_generation']/summary['total']*100:.1f}%)")
    
    if execute:
        print(f"Successful code execution: {summary['successful_execution']} ({summary['successful_execution']/summary['total']*100:.1f}%)")
    
    print(f"Failed queries: {summary['failed']} ({summary['failed']/summary['total']*100:.1f}%)")
    
    # Save summary if requested
    if save_results:
        os.makedirs("results", exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        summary_file = f"results/processing_summary_{timestamp}.json"
        
        with open(summary_file, 'w') as f:
            json.dump(summary, f, indent=2)
        print(f"\n💾 Summary saved to {summary_file}")
    
    return results, summary

def interactive_mode():
    """Run the program in interactive mode."""
    print("\n=== PyDough Query Processor - Interactive Mode ===")
    
    # Check requirements
    if not check_requirements():
        return
    
    # Get all queries and categorize them
    all_queries = {}
    categories = []
    
    # Try to read all categories of queries
    for domain in DOMAINS.keys():
        domain_queries = get_queries(domain)
        if domain_queries:
            all_queries[domain] = domain_queries
            categories.append(domain)
    
    if not categories:
        print("No queries found in any category. Exiting.")
        return
    
    print(f"\nFound queries for the following categories: {', '.join(categories)}")
    
    # Global settings
    use_code_review = False
    domain = None  # Auto-detect by default
    
    while True:
        domain_status = f"Auto-detect (current: {domain})" if domain else "Auto-detect"
        
        print("\n=== Menu ===")
        print("1. Process a specific query by category")
        print("2. Process a custom query")
        print("3. Process multiple queries in batch")
        print("4. List all queries by category")
        print("5. Toggle LLM code review (Currently: " + ("ON" if use_code_review else "OFF") + ")")
        print(f"6. Set database domain (Currently: {domain_status})")
        print("7. Exit")
        
        choice = input("\nEnter your choice (1-7): ")
        
        if choice == "1":
            # First select a category
            print("\nAvailable categories:")
            for i, category in enumerate(categories):
                print(f"{i+1}. {category} ({len(all_queries[category])} queries)")
            
            try:
                category_index = int(input("\nEnter the number of the category (or 0 to cancel): ")) - 1
                if 0 <= category_index < len(categories):
                    selected_category = categories[category_index]
                    category_queries = all_queries[selected_category]
                    
                    # Then select a query within that category
                    print(f"\nQueries for {selected_category}:")
                    for i, query in enumerate(category_queries):
                        print(f"{i+1}. {query}")
                    
                    query_index = int(input("\nEnter the number of the query you want to process (or 0 to cancel): ")) - 1
                    if 0 <= query_index < len(category_queries):
                        selected_query = category_queries[query_index]
                        should_execute = input("Execute the generated code? (y/n): ").lower() == 'y'
                        # Use the selected category as domain hint if auto-detect is not enabled
                        current_domain = selected_category if domain else None
                        process_query(selected_query, execute=should_execute, use_code_review=use_code_review, domain=current_domain)
                    else:
                        print("No query selected or invalid query number")
                else:
                    print("No category selected or invalid category number")
            except ValueError:
                print("Invalid input. Please enter a number.")
                
        elif choice == "2":
            custom_query = input("\nEnter your custom query about any supported database: ")
            if custom_query:
                should_execute = input("Execute the generated code? (y/n): ").lower() == 'y'
                process_query(custom_query, execute=should_execute, use_code_review=use_code_review, domain=domain)
            else:
                print("No query entered")
                
        elif choice == "3":
            # First, select a category
            print("\nSelect a category for batch processing:")
            print("0. All categories")
            for i, category in enumerate(categories):
                print(f"{i+1}. {category} ({len(all_queries[category])} queries)")
                
            try:
                category_index = int(input("\nEnter the number of the category (0 for all): "))
                if 0 <= category_index <= len(categories):
                    # Determine which queries to process
                    if category_index == 0:
                        # All queries
                        queries_to_process = []
                        for cat in categories:
                            queries_to_process.extend(all_queries[cat])
                        batch_category = None  # No specific category hint for auto-detect
                    else:
                        # Specific category
                        selected_category = categories[category_index-1]
                        queries_to_process = all_queries[selected_category]
                        batch_category = selected_category  # Use the selected category as a hint if auto-detect is not enabled
                    
                    max_queries = int(input(f"\nHow many queries to process (max {len(queries_to_process)})? Enter 0 for all: "))
                    if max_queries == 0:
                        max_queries = None
                        
                    should_execute = input("Execute the generated code for each query? (y/n): ").lower() == 'y'
                    
                    # Override batch category with selected domain if auto-detect is not enabled
                    final_domain = domain if domain else batch_category
                    
                    # Process the queries
                    results, summary = process_all_queries(
                        queries_to_process, 
                        max_queries=max_queries, 
                        execute=should_execute,
                        use_code_review=use_code_review,
                        domain=final_domain
                    )
                else:
                    print("Invalid category selection")
            except ValueError:
                print("Invalid input. Please enter a number.")
                
        elif choice == "4":
            print("\nAll queries by category:")
            for category in categories:
                print(f"\n--- {category} ({len(all_queries[category])} queries) ---")
                for i, query in enumerate(all_queries[category]):
                    print(f"{i+1}. {query}")
                
        elif choice == "5":
            use_code_review = not use_code_review
            status = "enabled" if use_code_review else "disabled"
            print(f"\nLLM code review is now {status}")
                
        elif choice == "6":
            print("\nAvailable domains:")
            print("1. Auto-detect (default)")
            for i, available_domain in enumerate(sorted(DOMAINS.keys())):
                print(f"{i+2}. {available_domain}")
            
            domain_choice = input(f"\nEnter domain choice (1-{len(DOMAINS)+1}): ")
            try:
                choice_num = int(domain_choice)
                if choice_num == 1:
                    domain = None
                    print("Domain set to Auto-detect")
                elif 2 <= choice_num <= len(DOMAINS)+1:
                    domain = sorted(DOMAINS.keys())[choice_num-2]
                    print(f"Domain set to {domain}")
                else:
                    print("Invalid choice, keeping current setting")
            except ValueError:
                print("Invalid input, keeping current setting")
                
        elif choice == "7":
            print("\nExiting...")
            break
            
        else:
            print("Invalid choice. Please enter a number between 1 and 7.")

def main():
    """Main function to parse arguments and run the program."""
    parser = argparse.ArgumentParser(description='Process PyDough queries using LLM')
    parser.add_argument('--query', '-q', type=str, help='A specific query to process')
    parser.add_argument('--category', '-c', type=str, help='Process queries from a specific category')
    parser.add_argument('--batch', '-b', type=int, help='Process the first N queries in batch mode')
    parser.add_argument('--execute', '-e', action='store_true', help='Execute the generated PyDough code')
    parser.add_argument('--interactive', '-i', action='store_true', help='Run in interactive mode')
    parser.add_argument('--review', action='store_true', help='Enable LLM code review (disabled by default)')
    parser.add_argument('--domain', '-d', type=str, choices=['auto'] + list(DOMAINS.keys()), 
                      default='auto', help='Specify database domain to use')
    parser.add_argument('--run-file', '-r', type=str, help='Execute an existing PyDough Python file (e.g., results/code_query.py)')
    parser.add_argument('--list-categories', '-l', action='store_true', help='List all available query categories')
    
    args = parser.parse_args()
    
    # List categories and exit if requested
    if args.list_categories:
        # Read queries.csv to find all categories
        all_queries = {}
        for domain in DOMAINS.keys():
            domain_queries = get_queries(domain)
            if domain_queries:
                all_queries[domain] = domain_queries
        
        if all_queries:
            print("\nAvailable Categories:")
            for category, queries in all_queries.items():
                print(f"- {category}: {len(queries)} queries")
        else:
            print("No query categories found.")
        return
    
    # If run-file is specified, just execute that file
    if args.run_file:
        if os.path.exists(args.run_file):
            print(f"Executing existing file: {args.run_file}")
            execution_result = execute_pydough_script(args.run_file)
            
            # Determine a base filename from the input file path for saving artifacts
            try:
                base_filename_from_path = os.path.basename(args.run_file).replace('.py', '')
                # Prefix with 'runfile_' to distinguish from normal processing results if not already clear
                if not any(base_filename_from_path.startswith(f"{domain.lower()}_query_") for domain in DOMAINS.keys()):
                    base_filename = f"runfile_{base_filename_from_path}" 
                else:
                    base_filename = base_filename_from_path
                save_execution_artifacts(execution_result, base_filename)
            except Exception as e:
                print(f"Error preparing to save results from run-file: {str(e)}")
            return
        else:
            print(f"Error: File {args.run_file} does not exist")
            return
    
    # Check requirements first
    if not check_requirements():
        return
    
    # Determine if code review should be used
    use_code_review = args.review
    
    # Determine domain
    domain_arg = None  # Default to auto-detect for process_query/process_all_queries
    if args.domain != 'auto':
        domain_arg = args.domain
    
    # Handle different modes
    if args.interactive:
        interactive_mode() # interactive_mode handles its own domain logic
    elif args.query:
        process_query(args.query, execute=args.execute, use_code_review=use_code_review, domain=domain_arg)
    elif args.category:
        # Process queries from a specific category
        category_queries = get_queries(args.category)
        if category_queries:
            if args.batch:
                batch_size = min(args.batch, len(category_queries))
                queries_to_process = category_queries[:batch_size]
            else:
                queries_to_process = category_queries
                
            process_all_queries(
                queries_to_process, 
                execute=args.execute, 
                use_code_review=use_code_review,
                domain=domain_arg or args.category # Use category as domain hint if auto-detect is enabled
            )
        else:
            print(f"No queries found for category '{args.category}'. Exiting.")
    elif args.batch:
        # Without category specified, use Broker queries for backward compatibility
        broker_queries = get_queries("Broker")
        if broker_queries:
            process_all_queries(broker_queries, max_queries=args.batch, execute=args.execute, 
                              use_code_review=use_code_review, domain=domain_arg)
        else:
            print("No broker queries found. Exiting.")
    else:
        # Default to interactive mode if no arguments provided
        interactive_mode()

if __name__ == "__main__":
    main() 