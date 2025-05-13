import React, { useState, useRef, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { ArrowUpCircle, X, Code, Database, Clipboard, RefreshCw } from 'lucide-react';

// Add CSS for the results table
const tableStyles = `
  .results-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 1rem;
    font-size: 0.875rem;
  }
  .results-header {
    background-color: #f3f4f6;
  }
  .results-header-cell {
    padding: 0.5rem 0.75rem;
    text-align: left;
    font-weight: 600;
    border-bottom: 2px solid #e5e7eb;
  }
  .results-row:nth-child(even) {
    background-color: #f9fafb;
  }
  .results-cell {
    padding: 0.5rem 0.75rem;
    border-bottom: 1px solid #e5e7eb;
  }
`;

// Component to display query results in different formats
const QueryResultsDisplay = ({ results }: { results: string | null }) => {
  if (!results) return null;
  
  // Check if results is likely HTML content
  const containsHtml = results.trim().startsWith('<') && results.includes('>');
  
  // If it looks like HTML, render it using dangerouslySetInnerHTML
  if (containsHtml) {
    return (
      <div className="max-w-full overflow-x-auto">
        <style>{tableStyles}</style>
        <div dangerouslySetInnerHTML={{ __html: results }} />
      </div>
    );
  }
  
  // For plain text results
  return (
    <div className="max-w-full whitespace-pre-wrap font-mono text-sm overflow-x-auto">
      {results}
    </div>
  );
};

const Query = () => {
  const {
    currentQuery,
    setCurrentQuery,
    queryResults,
    generatedCode,
    generatedSQL,
    processQuery,
    isLoading,
    error,
    setError,
    detectedDomain,
    availableDatabases,
    connectionStatus,
    clearConversationHistory,
  } = useAppContext();

  const [activeTab, setActiveTab] = useState<'results' | 'code' | 'sql'>('results');
  const [autoExecute, setAutoExecute] = useState<boolean>(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus the textarea when component mounts
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevent default form submission
    const queryToProcess = currentQuery.trim();
    
    if (!queryToProcess) {
      console.log("Query is empty, not submitting.");
      return; // Don't submit if query is empty
    }
    
    console.log(`Query generation successful, attempting auto-execution...`); // Log from screenshot
    setError(null); // Clear previous errors
    
    try {
      await processQuery(queryToProcess, autoExecute, null); // Call the context function
      console.log("processQuery finished successfully.");
    } catch (submissionError) {
      console.error("Error during processQuery call:", submissionError);
      setError(`Query processing failed: ${submissionError}`);
    }
  };

  const handleClearQuery = () => {
    setCurrentQuery('');
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleClearConversation = () => {
    clearConversationHistory();
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-grow overflow-auto">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Natural Language Query</h1>
            <p className="text-sm text-gray-600">
              Ask questions about your data in plain English
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mb-6">
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={currentQuery}
                onChange={(e) => setCurrentQuery(e.target.value)}
                placeholder="Show me sales data by region for the last quarter..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg pr-12 min-h-[100px] focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              {currentQuery && (
                <button
                  type="button"
                  onClick={handleClearQuery}
                  className="absolute right-12 top-3 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
              <button
                type="submit"
                disabled={isLoading || !connectionStatus || currentQuery.trim() === ''}
                className={`absolute right-3 top-3 ${
                  isLoading || !connectionStatus || currentQuery.trim() === ''
                    ? 'text-gray-300'
                    : 'text-primary-600 hover:text-primary-800'
                }`}
              >
                {isLoading ? (
                  <RefreshCw className="h-5 w-5 animate-spin" />
                ) : (
                  <ArrowUpCircle className="h-5 w-5" />
                )}
              </button>
            </div>

            <div className="flex justify-between mt-2">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="autoExecute"
                  checked={autoExecute}
                  onChange={() => setAutoExecute(!autoExecute)}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="autoExecute" className="ml-2 text-sm text-gray-700">
                  Auto-execute generated code
                </label>
              </div>
              <button
                type="button"
                onClick={handleClearConversation}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Clear conversation
              </button>
            </div>
          </form>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700">
              <p className="font-medium">Error processing query: {error}</p>
            </div>
          )}

          {detectedDomain && (
            <div className="mb-6 text-sm text-gray-500">
              The system will automatically detect the most appropriate database domain for your query. Current domain: <span className="font-medium">{detectedDomain}</span>
            </div>
          )}

          {(generatedCode || generatedSQL || queryResults) && (
            <div className="mb-6">
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                  <button
                    onClick={() => setActiveTab('results')}
                    className={`px-1 py-4 text-sm font-medium ${
                      activeTab === 'results'
                        ? 'border-b-2 border-primary-500 text-primary-600'
                        : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Results
                  </button>
                  <button
                    onClick={() => setActiveTab('code')}
                    className={`px-1 py-4 text-sm font-medium ${
                      activeTab === 'code'
                        ? 'border-b-2 border-primary-500 text-primary-600'
                        : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <span className="flex items-center">
                      <Code className="h-4 w-4 mr-1" />
                      PyDough Code
                    </span>
                  </button>
                  <button
                    onClick={() => setActiveTab('sql')}
                    className={`px-1 py-4 text-sm font-medium ${
                      activeTab === 'sql'
                        ? 'border-b-2 border-primary-500 text-primary-600'
                        : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <span className="flex items-center">
                      <Database className="h-4 w-4 mr-1" />
                      SQL
                    </span>
                  </button>
                </nav>
              </div>

              <div className="mt-4">
                {activeTab === 'results' && queryResults && (
                  <div className="p-4 bg-white rounded-md shadow">
                    <QueryResultsDisplay results={queryResults} />
                  </div>
                )}

                {activeTab === 'code' && generatedCode && (
                  <div className="p-4 bg-gray-800 text-white rounded-md shadow relative">
                    <button
                      onClick={() => navigator.clipboard.writeText(generatedCode)}
                      className="absolute top-2 right-2 text-gray-400 hover:text-white"
                      title="Copy to clipboard"
                    >
                      <Clipboard className="h-4 w-4" />
                    </button>
                    <pre className="overflow-x-auto whitespace-pre-wrap">{generatedCode}</pre>
                  </div>
                )}

                {activeTab === 'sql' && generatedSQL && (
                  <div className="p-4 bg-gray-800 text-white rounded-md shadow relative">
                    <button
                      onClick={() => navigator.clipboard.writeText(generatedSQL)}
                      className="absolute top-2 right-2 text-gray-400 hover:text-white"
                      title="Copy to clipboard"
                    >
                      <Clipboard className="h-4 w-4" />
                    </button>
                    <pre className="overflow-x-auto whitespace-pre-wrap">{generatedSQL}</pre>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="mt-8">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Sample Queries</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">For TPCH:</h3>
                <ul className="space-y-2">
                  <li>
                    <button
                      onClick={() => setCurrentQuery("List all suppliers and their regions")}
                      className="text-sm text-primary-600 hover:text-primary-800 hover:underline"
                    >
                      List all suppliers and their regions
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => setCurrentQuery("Show orders with highest line item count")}
                      className="text-sm text-primary-600 hover:text-primary-800 hover:underline"
                    >
                      Show orders with highest line item count
                    </button>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">General Queries:</h3>
                <ul className="space-y-2">
                  <li>
                    <button
                      onClick={() => setCurrentQuery("Show me the total count of records in each table")}
                      className="text-sm text-primary-600 hover:text-primary-800 hover:underline"
                    >
                      Show me the total count of records in each table
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => setCurrentQuery("What is the most recent transaction in the database?")}
                      className="text-sm text-primary-600 hover:text-primary-800 hover:underline"
                    >
                      What is the most recent transaction in the database?
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => setCurrentQuery("Create a summary report of key metrics")}
                      className="text-sm text-primary-600 hover:text-primary-800 hover:underline"
                    >
                      Create a summary report of key metrics
                    </button>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 text-sm text-gray-700 border-t border-gray-200">
        <h3 className="font-medium mb-2">Conversation Log (Debug):</h3>
      </div>
    </div>
  );
};

export default Query; 