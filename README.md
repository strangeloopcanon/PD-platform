# Snowflake Analysis Platform

A modern web application for interacting with Snowflake databases using natural language queries, metadata management, and advanced analytics.

## Features

- **Database Connection Management**: Connect to your Snowflake database securely
- **Metadata Management**: Convert database schema to metadata and customize field properties
- **Natural Language Querying**: Transform natural language into PyDough and SQL
- **Interactive Notebooks**: Analyze data with Jupyter-like notebooks with AI assistance
- **Modern UI**: Built with React and Tailwind CSS for a responsive experience

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Routing**: React Router v6
- **Code Editor**: Monaco Editor
- **UI Components**: Custom components with Lucide React icons
- **Build Tool**: Vite

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository
   ```bash
   git clone [repository-url]
   cd snowflake-analysis-platform
   ```

2. Install dependencies
   ```bash
   npm install
   # or
   yarn
   ```

3. Start the development server
   ```bash
   npm run dev
   # or
   yarn dev
   ```

4. Open your browser and navigate to `http://localhost:5173`

## Project Structure

```
src/
  ├── components/      # Reusable UI components
  ├── context/         # React context for state management
  ├── pages/           # Application pages
  │   ├── Dashboard.tsx         # Main dashboard
  │   ├── ConnectionPage.tsx    # Database connection management
  │   ├── MetadataPage.tsx      # Schema and metadata management
  │   ├── QueryPage.tsx         # Natural language query interface
  │   └── NotebookPage.tsx      # Notebook analysis interface
  ├── App.tsx          # Main application component
  └── main.tsx         # Application entry point
```

## Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run preview` - Preview the production build
