# New Developer Guide

This guide offers a quick overview of the **PD-platform** codebase for newcomers.
It complements the main `README.md` and points to areas worth exploring next.

## Repository Overview

`PD-platform` combines a React TypeScript frontend with a Python Flask backend.
Key directories include:

- `src/` – React UI components, pages, and context for managing app state.
- `text_to_pydough/` – Flask API and the PyDough Query Processor.
- `start.sh` – Convenience script to run both frontend and backend together.

## General Workflow

1. The frontend collects a natural language query and sends it to `/api/query` or `/api/query-lg`.
2. `app.py` routes the request and calls `pydough_query_processor.py`.
3. The processor detects the domain, generates PyDough code, optionally converts it to SQL, and executes it against the appropriate SQLite database.
4. Results are returned to the frontend for display in the "Results," "PyDough Code," and "SQL" tabs.

## Key Features

- **Multiple Domains** – Broker, Dealership, DermTreatment, Ewallet, TPCH, and more, with domain detection via LLM and keyword fallback.
- **Structured Output** – Pydantic models ensure consistent responses from the LLM.
- **LangGraph Integration** – Optional workflow using LangGraph for improved state management.

## Running the Application

1. Install Node and Python dependencies (see the main `README.md`).
2. Place required `.db` files in `text_to_pydough/data/`.
3. Run `./start.sh` from the repository root to launch both servers.

## What to Explore Next

- **Frontend State Management** – `src/context/AppContext.tsx`.
- **LLM Prompting & Code Generation** – `text_to_pydough/pydough_query_processor.py`.
- **LangGraph Workflow** – `text_to_pydough/langgraph_impl.py`.
- **Adding New Domains** – Update the `DOMAINS` map and provide schema metadata in `text_to_pydough/data/`.

## Further Learning

- Tailwind and React component patterns.
- Flask API design and error handling in `app.py`.
- LLM configuration via the backend `README.md`.


