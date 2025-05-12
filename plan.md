# Integration Plan: PyDough Query Processor + React Frontend

## Overview
This plan outlines how to integrate the PyDough query processor with our React frontend application to create a complete natural language to PyDough/SQL conversion pipeline.

## 1. Backend API Layer

### 1.1 Create API Endpoints
- Create a Flask/FastAPI backend with these endpoints:
  - `GET /api/databases` - List available databases from data folder
  - `POST /api/connect` - Connect to a selected database
  - `GET /api/metadata/:domain` - Get schema metadata for visualization
  - `POST /api/query` - Process natural language query
  - `POST /api/execute` - Execute generated PyDough code
  - `GET /api/history` - Get query history

### 1.2 Adapt Core PyDough Functions
- Wrap key functions from pydough_query_processor.py:
  - `detect_domain()` → Domain detection endpoint
  - `process_query()` → Query processing endpoint
  - `execute_pydough_script()` → Code execution endpoint
  - `save_execution_artifacts()` → Result storage functionality

## 2. Frontend Component Updates

### 2.1 ConnectionPage
- **Scan & Display**:
  - Auto-scan data folder for available .db files on page load
  - Show them in a structured list with domain information
  - Display connection status for each database
- **Connect Functionality**:
  - Keep "Connect" button for explicit connection
  - Add status indicators (connected/disconnected)
  - Store connection state in AppContext

### 2.2 MetadataPage
- **Schema Visualization**:
  - Load schema from JSON files (e.g., Broker_graph.json)
  - Create visual graph representation of database schema
  - Add zoom/pan/filter controls
- **Metadata Editing**:
  - Enable field property customization
  - Add field description editing
  - Implement metadata save functionality

### 2.3 QueryPage
- **Natural Language Interface**:
  - Enhanced query input with autocomplete suggestions
  - Add domain selection dropdown (with auto-detect option)
  - Implement query history sidebar
- **Results Display**:
  - Show generated PyDough code in Monaco editor
  - Display corresponding SQL
  - Present data results in interactive table
  - Add "Export Results" functionality

### 2.4 NotebookPage
- **Jupyter-like Interface**:
  - Create code cells with Monaco editor
  - Implement cell execution flow
  - Show results below each cell
  - Add visualization options for results
- **AI Assistance**:
  - Implement code suggestion/completion
  - Add data analysis recommendations

### 2.5 Dashboard Updates
- Add tiles for available domains from PyDough processor
- Display recent query history from stored results
- Show sample queries for each domain

## 3. AppContext Enhancements

### 3.1 New State Properties
- `availableDatabases`: List of databases found in data folder
- `domainMetadata`: Schema metadata for visualization
- `detectedDomain`: Current detected domain for query
- `generatedCode`: PyDough code from natural language query
- `generatedSQL`: SQL generated from PyDough
- `queryResults`: Results from execution

### 3.2 New Methods
- `scanDatabases()`: Find available databases
- `connectDatabase(domain)`: Connect to specific domain database
- `processQuery(query, domain)`: Process NL query to PyDough
- `executeCode(code)`: Execute PyDough code
- `saveFavoriteQuery(query)`: Add query to favorites

## 4. Implementation Phases

### Phase 1: Backend API Setup
- Create API wrapper around PyDough processor
- Implement database scanning functionality
- Test basic query processing

### Phase 2: Connection & Metadata
- Update ConnectionPage to display available databases
- Implement metadata visualization on MetadataPage

### Phase 3: Query & Results
- Enhance QueryPage with NL processing
- Implement results display and history

### Phase 4: Notebook & Dashboard
- Create notebook interface with code execution
- Update dashboard with domain-aware components

## 5. Testing Plan
- Test database connection with all domains
- Validate query processing pipeline
- Verify results display and export
- Test notebook functionality

## Implementation Progress Summary

### Completed Work

1. **AppContext Enhancements**
   - ✅ Added new state properties for database domains, metadata, query generation
   - ✅ Implemented mock methods for database operations (scanDatabases, loadDomainMetadata)
   - ✅ Added methods for query processing (processQuery) and code execution (executeCode)
   - ✅ Set up automatic domain scanning on application load

2. **ConnectionPage Updates**
   - ✅ Redesigned to show available databases from data folder
   - ✅ Implemented connection status indicators 
   - ✅ Added domain-specific information display with keywords
   - ✅ Created rescan functionality to refresh database list

3. **MetadataPage Updates**
   - ✅ Created interface to browse database schema by domain
   - ✅ Implemented table and field browsing functionality
   - ✅ Added field description editing capabilities
   - ✅ Created placeholder for relationship visualization

4. **QueryPage Updates**
   - ✅ Implemented natural language query input with domain selection
   - ✅ Added tabbed results display for generated code, SQL, and results
   - ✅ Created Monaco editor integration for code viewing/editing
   - ✅ Added domain-specific sample queries
   - ✅ Implemented favoriting functionality for queries

5. **Dashboard Updates**
   - ✅ Added available databases section showing domains from PyDough
   - ✅ Integrated recent query history from actual queries
   - ✅ Updated workflow cards to reflect PyDough integration

### Remaining Work

1. **Backend Implementation**
   - Create actual API endpoints to connect with PyDough query processor
   - Implement real domain scanning based on data folder contents
   - Connect NL queries to actual PyDough code generation

2. **Notebook Page**
   - Implement Jupyter-like notebook interface
   - Create code cell execution workflow
   - Add visualization capabilities for results

3. **Production Integration**
   - Connect frontend to actual PyDough processor
   - Set up proper error handling and loading states
   - Add file upload capabilities for custom databases
   - Implement proper authentication and session management 