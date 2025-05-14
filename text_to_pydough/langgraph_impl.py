#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
LangGraph Implementation for PyDough Query Processor

This module implements a LangGraph-based workflow for processing natural language
queries to PyDough code with improved state management, domain detection, and code generation.
"""

import os
import json
import re
from typing import Annotated, Dict, List, Optional, TypedDict, Literal
import operator

# Import LangGraph components
from langgraph.graph import StateGraph, MessagesState, START, END
from langgraph.graph.message import add_messages
from langchain_core.messages import HumanMessage, AIMessage

# Import from existing implementation
from pydough_query_processor import (
    DOMAINS, 
    read_file_content,
    PyDoughResponse, 
    DomainDetection,
    adapt_and_execute_code,
    execute_pydough_script,
    save_execution_artifacts
)

import llm

# Define our graph state
class QueryState(MessagesState):
    """State for the PyDough query processing graph."""
    domain: str = ""
    schema_content: str = ""
    cheatsheet_content: str = ""
    pydough_code: str = ""
    explanation: Optional[str] = None
    execution_result: Optional[Dict] = None
    error: Optional[str] = None

# Node 1: Domain Detection
def detect_domain_node(state: QueryState) -> Dict:
    """
    Detect which domain the query is related to using LLM with structured output.
    """
    # Extract the query from the last message
    last_message = state["messages"][-1]
    if not isinstance(last_message, HumanMessage):
        return {"error": "Expected a human message as the last message."}
    
    query_text = last_message.content

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
    # Use gemini-2.0-flash for efficient domain detection
    model = llm.get_model("gemini-2.0-flash")
    
    try:
        # Get structured response
        response = model.prompt(prompt, schema=DomainDetection, temperature=0.01)
        response_text = response.text()
        data = json.loads(response_text)
        
        detected_domain = data["domain"]
        
        # Check if detected domain exists in our configuration
        if detected_domain in DOMAINS:
            # Prepare schema content
            schema_content = ""
            schema_file_path = os.path.join("data", f"{detected_domain.lower()}.md")
            
            if os.path.exists(schema_file_path):
                schema_content = read_file_content(schema_file_path)
            
            # Read cheatsheet content
            cheatsheet_content = read_file_content('cheatsheet.md')
            
            # Return updates to state
            return {
                "domain": detected_domain,
                "schema_content": schema_content,
                "cheatsheet_content": cheatsheet_content,
                "messages": [AIMessage(content=f"I'll help you query the {detected_domain} database.")]
            }
        else:
            # Domain not recognized
            return {
                "error": f"Detected domain '{detected_domain}' is not in our list of supported domains.",
                "messages": [AIMessage(content=f"I couldn't identify a supported database domain for your query. Please try again with a query about one of these domains: {', '.join(DOMAINS.keys())}.")]
            }
    except Exception as e:
        # Error handling
        return {
            "error": f"Error during domain detection: {str(e)}",
            "messages": [AIMessage(content="I encountered a problem identifying the database domain for your query. Could you please rephrase it?")]
        }

# Node 2: Generate PyDough Code
def generate_code_node(state: QueryState) -> Dict:
    """Generate PyDough code based on the query and domain."""
    if state.get("error"):
        # Skip if there was an error in domain detection
        return {}
    
    # Get the query from the first human message
    query_text = ""
    for message in state["messages"]:
        if isinstance(message, HumanMessage):
            query_text = message.content
            break
    
    domain_name = state["domain"]
    schema_content = state["schema_content"]
    cheatsheet_content = state["cheatsheet_content"]
    
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
    
    prompt = f"""
# Task: Convert a natural language query into PyDough code for a {domain_name} database

# Domain Information
Current Domain: {domain_name}
{collections_info}

# User Query
{query_text}

# {domain_name} Schema Information
{schema_content}

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
    
    # Use gemini-2.5-pro for code generation
    model = llm.get_model("gemini-2.5-pro-preview-05-06")
    
    try:
        # Get structured response
        response = model.prompt(prompt, schema=PyDoughResponse, temperature=0.01)
        response_text = response.text()
        data = json.loads(response_text)
        
        pydough_code = data["code"]
        explanation = data.get("explanation", "No explanation provided.")
        
        # Ensure the code assigns to a variable named 'result'
        if not re.search(r'\bresult\s*=', pydough_code):
            if pydough_code.startswith('return '):
                pydough_code = pydough_code.replace('return ', 'result = ', 1)
            else:
                pydough_code = f"result = {pydough_code}"
        
        # Return updates to state
        return {
            "pydough_code": pydough_code,
            "explanation": explanation,
            "messages": [AIMessage(content=f"Here's the PyDough code for your query:\n```python\n{pydough_code}\n```")]
        }
    except Exception as e:
        # Error handling
        return {
            "error": f"Error generating PyDough code: {str(e)}",
            "messages": [AIMessage(content=f"I encountered a problem generating the PyDough code for your query. Error: {str(e)}")]
        }

# Node 3: Execute PyDough Code (optional)
def execute_code_node(state: QueryState) -> Dict:
    """Execute the generated PyDough code if requested."""
    if state.get("error") or not state.get("pydough_code"):
        # Skip if there was an error or no code generated
        return {}
    
    pydough_code = state["pydough_code"]
    domain_name = state["domain"]
    
    # Get domain info
    domain_info = (
        domain_name, 
        DOMAINS[domain_name]["metadata_file"], 
        DOMAINS[domain_name]["database_file"]
    )
    
    try:
        # Create temporary script file name (just the name, not the full path yet)
        output_file_name = f"temp_{domain_name}_query.py"
        
        # Adapt and execute code - this function returns (adapted_code_content, output_file_path)
        adapted_code_content, output_file_path = adapt_and_execute_code(
            pydough_code, 
            output_file_name, 
            domain_info
        )
        
        if adapted_code_content:
            # Execute the script using the full output_file_path from adapt_and_execute_code
            execution_result = execute_pydough_script(output_file_path)
            
            # Format result for display
            if execution_result["success"]:
                result_text = "Execution successful!\n\n"
                # Check if the execution output itself contains structured result data
                # This part might need adjustment based on how execute_pydough_script structures its return
                if "output" in execution_result and execution_result["output"]:
                    # A simple way to show output, might need more sophisticated parsing for tables
                    # Example: if pandas_df is in output, format as table
                    if "SQL Query:" in execution_result["output"] and "Result:" in execution_result["output"]:
                         result_text += execution_result["output"]
                    else: # Fallback for other kinds of output
                         result_text += f"Raw output:\n{execution_result['output']}"
                else:
                    result_text += "No specific result data found in execution output."
            else:
                result_text = f"Execution failed: {execution_result.get('error', 'Unknown error')}"
            
            # Return updates to state
            return {
                "execution_result": execution_result,
                "messages": [AIMessage(content=result_text)]
            }
        else:
            return {
                "error": "Failed to adapt and execute code",
                "messages": [AIMessage(content="I couldn't execute the generated code. There might be an issue with adapting it for execution.")]
            }
    except Exception as e:
        # Error handling
        return {
            "error": f"Error executing PyDough code: {str(e)}",
            "messages": [AIMessage(content=f"I encountered a problem executing the PyDough code. Error: {str(e)}")]
        }

# Define the edge routing logic
def should_execute_code(state: QueryState) -> Literal["execute_code_node", "END"]:
    """Determine whether to execute the code based on state."""
    if state.get("error"):
        return "END"
    
    # Currently set to always execute, but could be conditional based on a flag
    return "execute_code_node"

# Build the graph
def build_pydough_query_graph(execute_code: bool = True) -> StateGraph:
    """Build the LangGraph for PyDough query processing."""
    # Create builder using newer LangGraph API
    builder = StateGraph(QueryState)
    
    # Add nodes
    builder.add_node("detect_domain", detect_domain_node)
    builder.add_node("generate_code", generate_code_node)
    
    if execute_code:
        builder.add_node("execute_code_node", execute_code_node)
    
    # Add edges for basic flow
    builder.add_edge(START, "detect_domain")
    builder.add_edge("detect_domain", "generate_code")
    
    if execute_code:
        # Add conditional edge to optionally execute code
        builder.add_conditional_edges(
            "generate_code",
            should_execute_code,
            {
                "execute_code_node": "execute_code_node",
                "END": END
            }
        )
        builder.add_edge("execute_code_node", END)
    else:
        builder.add_edge("generate_code", END)
    
    # Return the graph (don't call .compile() - it's handled differently in newer versions)
    return builder

# Function to process a query using the LangGraph
def process_query_with_graph(query_text: str, execute_code: bool = True):
    """Process a natural language query using the LangGraph workflow."""
    # Build the graph builder
    graph_builder = build_pydough_query_graph(execute_code=execute_code)
    
    # Compile the graph (no checkpointer needed for this simple test)
    compiled_graph = graph_builder.compile()
    
    # Initialize state with query
    initial_state = {
        "messages": [HumanMessage(content=query_text)],
        "domain": "",
        "schema_content": "",
        "cheatsheet_content": "",
        "pydough_code": "",
        "explanation": None,
        "execution_result": None,
        "error": None
    }
    
    # Invoke the compiled graph
    final_state = compiled_graph.invoke(initial_state)
    
    return final_state

# Example usage
if __name__ == "__main__":
    # Test with a sample query
    sample_query = "Show me all customers from the broker database"
    result = process_query_with_graph(sample_query, execute_code=True)
    
    # Print messages from the conversation
    print("\nConversation:")
    for message in result["messages"]:
        sender = "User" if isinstance(message, HumanMessage) else "Assistant"
        print(f"{sender}: {message.content}")
    
    # Print final state information
    print("\nFinal State:")
    print(f"Domain: {result['domain']}")
    print(f"Code: {result['pydough_code']}")
    if result["execution_result"]:
        print(f"Execution Success: {result['execution_result']['success']}")
    if result["error"]:
        print(f"Error: {result['error']}") 