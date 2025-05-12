# PyDough Platform

A web interface for interacting with the PyDough query processor, which transforms natural language queries into PyDough code and SQL for database analysis using Large Language Models (LLMs).

## Features

-   Connect to databases in multiple domains (Broker, Dealership, DermTreatment, Ewallet, TPCH).
-   Visualize database schema metadata.
-   Process natural language queries to generate PyDough code and SQL.
-   Execute generated code and view results.
-   Save and manage query history.
-   (Backend) Structured LLM output for reliable code generation.
-   (Backend) LLM-based domain detection.

## Project Structure

-   `src/`: React frontend (UI)
    -   `components/`: UI components
    -   `context/`: React context for application state
    -   `pages/`: Application pages
-   `text_to_pydough/`: Python backend (API and Query Processor)
    -   `data/`: Contains database schema (`.json`) files. **Note:** Large database (`.db`) files are not included in the repository due to size limits and must be obtained or generated separately.
    -   `app.py`: Flask API server
    -   `pydough_query_processor.py`: Core LLM and PyDough logic
    -   `requirements.txt`: Python dependencies
-   `start.sh`: Script to run both frontend and backend concurrently.
-   `.gitignore`: Specifies intentionally untracked files (like `.db` files, `venv`, `.env`).

## Prerequisites

-   **Node.js:** v16 or later (for the frontend)
-   **Python:** 3.9 or later (for the backend)
-   **Git:** For cloning the repository.
-   **LLM API Key:** A Google Gemini API key is required for the backend query processing. You can get one from [Google AI Studio](https://ai.google.dev/).

## Setup Instructions

1.  **Clone the Repository:**
    ```bash
    git clone <repository-url> # Replace <repository-url> with the actual URL
    cd PD-platform
    ```

2.  **Set Up Frontend:**
    ```bash
    npm install
    ```
    This installs all necessary Node.js packages listed in `package.json`.

3.  **Set Up Backend:**
    ```bash
    cd text_to_pydough
    python3 -m venv venv # Create a virtual environment
    source venv/bin/activate # Activate the environment (use `venv\Scripts\activate` on Windows)
    pip install -r requirements.txt # Install Python packages
    ```

4.  **Configure Gemini API Key:**
    You need to provide your Gemini API key to the backend. Choose one method:

    *   **(Recommended) Using `llm` CLI:** The `llm` tool (installed via `requirements.txt`) provides a secure way to manage keys.
        ```bash
        # Make sure your virtual environment is active
        source venv/bin/activate
        llm keys set gemini
        ```
        Paste your API key when prompted.

    *   **(Alternative) Using a `.env` file:**
        ```bash
        # In the text_to_pydough directory
        cp .env.example .env
        ```
        Then, edit the `text_to_pydough/.env` file and replace `your_gemini_api_key_here` with your actual key.

5.  **Obtain Database Files:**
    -   The large `.db` files needed for the different data domains (e.g., `tpch.db`, `Broker.db`) are **not** included in this repository due to size constraints.
    -   You will need to place the required `.db` files (such as `tpch.db`) into the `text_to_pydough/data/` directory for the application to connect to them. Ensure the filenames match those expected by the configuration in `text_to_pydough/pydough_query_processor.py`.

## Running the Application

The easiest way to run both the frontend and backend is using the provided script:

1.  **Make the script executable (if needed):**
    ```bash
    chmod +x start.sh
    ```

2.  **Run the script from the project root directory (`PD-platform`):**
    ```bash
    ./start.sh
    ```

This script will:
-   Start the Python Flask backend (usually on `http://localhost:5001`).
-   Start the React frontend development server (usually on `http://localhost:5173`).
-   Attempt to open the application in your default web browser.

**Alternatively, run Frontend and Backend Separately:**

*   **Backend:**
    ```bash
    cd text_to_pydough
    source venv/bin/activate # Activate virtual environment if not already active
    python app.py
    ```

*   **Frontend:** (In a separate terminal)
    ```bash
    # From the project root directory (PD-platform)
    npm run dev
    ```
    Then open `http://localhost:5173` (or the address shown in the terminal) in your browser.

## Development Notes

-   **Repository Hygiene:** Avoid committing large files (like `.db` databases), secrets, or generated files (`venv`, `__pycache__`). Use the `.gitignore` file to prevent this. If you accidentally commit a large file, you may need to remove it from the Git history using tools like [BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/) or `git filter-branch`.
-   **Adding New Domains:** Update the `DOMAINS` dictionary in `text_to_pydough/pydough_query_processor.py` and add corresponding schema (`.json`) and database (`.db`) files to the `text_to_pydough/data/` directory.
-   **Branching:** Use feature branches (`git checkout -b feature/your-feature-name`) for new work and create Pull Requests for merging changes.
