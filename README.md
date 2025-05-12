# PyDough Platform

A web interface for interacting with the PyDough query processor, which transforms natural language queries into PyDough code and SQL for database analysis.

## Features

- Connect to databases in multiple domains (Broker, Dealership, DermTreatment, Ewallet, TPCH)
- Visualize database schema metadata
- Process natural language queries to generate PyDough code and SQL
- Execute generated code and view results
- Save and manage query history

## Project Structure

- `src/` - React frontend
  - `components/` - UI components
  - `context/` - React context for application state
  - `pages/` - Application pages
- `text_to_pydough/` - Python backend and PyDough processor
  - `data/` - Database files and metadata
  - `app.py` - Flask API
  - `pydough_query_processor.py` - Core PyDough processing functionality

## Prerequisites

- Node.js (v16+)
- Python 3.9+
- LLM API keys for Gemini (required for PyDough processor)
- llm-gemini plugin for the llm package

## Setup

1. Clone the repository:
   ```bash
   git clone [repository-url]
   cd PD-platform
   ```

2. Install frontend dependencies:
   ```bash
   npm install
   ```

3. Set up the Python environment for the backend:
   ```bash
   cd text_to_pydough
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt  # This installs llm and llm-gemini plugins
   ```

4. Set up LLM API key for Gemini:
   ```bash
   llm keys set gemini
   ```
   Enter your API key when prompted.

## Running the Application

You can run both the frontend and backend using the provided start script:

```bash
./start.sh
```

This will:
1. Start the Flask backend on port 5000
2. Start the React development server on port 5173
3. Open your browser to the application

Alternatively, you can start them separately:

**Backend:**
```bash
cd text_to_pydough
source venv/bin/activate  # On Windows: venv\Scripts\activate
python app.py
```

**Frontend:**
```bash
npm run dev
```

## Using the Application

1. **Connect to a Database**:
   - Go to the Connect page
   - Click "Connect" next to one of the available databases
   
2. **Explore Metadata**:
   - View the schema structure on the Metadata page
   - Browse tables and their fields
   
3. **Run Natural Language Queries**:
   - Enter a query like "Show me all customers with transactions over $1000"
   - View the generated PyDough code and SQL
   - See the results in a tabular format
   
4. **Analyze Data**:
   - Use the Notebook interface for more complex analysis
   - Save queries and results for later reference

## Development

- **Add New Domains**:
  - Add domain configurations to the `DOMAINS` dictionary in `pydough_query_processor.py`
  - Place database files in the `text_to_pydough/data/` directory
  
- **Extending the API**:
  - Add new endpoints to `app.py` in the `text_to_pydough/` directory
  
- **Frontend Components**:
  - Follow the existing patterns in `src/components/` for new UI elements

## License

[Specify license information]

## API Key Configuration

The PyDough platform uses Google's Gemini API for processing natural language queries. You need to configure an API key in one of the following ways:

### Option 1: Using a .env file (Recommended)

1. Copy the template .env file:
   ```bash
   cp text_to_pydough/.env.example text_to_pydough/.env
   ```

2. Edit the .env file and replace `your_gemini_api_key_here` with your actual Gemini API key from [Google AI Studio](https://ai.google.dev/)

3. Restart the application:
   ```bash
   ./start.sh
   ```

### Option 2: Using the web interface

1. Start the application:
   ```bash
   ./start.sh
   ```

2. Navigate to the Query page
3. Enter your Gemini API key in the form that appears
4. Click "Set API Key"

### Option 3: Using the command line

1. Activate the virtual environment:
   ```bash
   cd text_to_pydough
   source venv/bin/activate
   ```

2. Set the Gemini API key:
   ```bash
   llm keys set gemini
   ```

3. Enter your API key when prompted

Note: You only need to set the API key once. It will be remembered for future sessions.
