import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Play, Database, Save, Code, FileX, Download, CheckCircle, Key, Clipboard, RefreshCw, Settings } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import Editor from '@monaco-editor/react';

// Add new ApiKeySetup component
const ApiKeySetup: React.FC<{ onKeySet: () => void }> = ({ onKeySet }) => {
  const [apiKey, setApiKey] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    try {
      const response = await fetch('http://localhost:5001/api/api-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ api_key: apiKey })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSuccess(true);
        setTimeout(() => {
          onKeySet();
        }, 1500);
      } else {
        setError(data.error || 'Failed to set API key');
      }
    } catch (error) {
      setError('Network error: Could not connect to server');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6 mb-6">
      <h2 className="text-lg font-medium text-yellow-800 flex items-center">
        <Key className="h-5 w-5 mr-2" />
        Gemini API Key Required
      </h2>
      
      <p className="mt-2 text-sm text-yellow-700">
        The application needs a Gemini API key to process natural language queries.
        You can get a key from <a href="https://ai.google.dev/" target="_blank" rel="noopener noreferrer" className="underline">Google AI Studio</a>.
      </p>
      
      <form onSubmit={handleSubmit} className="mt-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter your Gemini API key"
            className="flex-1 px-3 py-2 border border-yellow-300 rounded-md shadow-sm focus:ring-yellow-500 focus:border-yellow-500"
            required
          />
          
          <button
            type="submit"
            disabled={isSubmitting || !apiKey.trim() || success}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50"
          >
            {isSubmitting ? 'Setting Key...' : success ? 'Key Set!' : 'Set API Key'}
          </button>
        </div>
        
        {error && (
          <p className="mt-2 text-sm text-red-600">{error}</p>
        )}
        
        {success && (
          <p className="mt-2 text-sm text-green-600 flex items-center">
            <CheckCircle className="h-4 w-4 mr-1" />
            API key set successfully! You can now use natural language queries.
          </p>
        )}
      </form>
      
      <div className="mt-4 text-xs text-yellow-600 bg-yellow-100 p-3 rounded">
        <p className="font-medium">Alternative Setup Methods:</p>
        
        <div className="mt-2">
          <p className="font-medium">Option 1: Using a .env file (recommended)</p>
          <code className="block mt-1 font-mono">
            # Create a file named .env in the text_to_pydough/ directory<br />
            GEMINI_API_KEY=your_api_key_here
          </code>
          <p className="mt-1 text-xs">Then restart the application with ./start.sh</p>
        </div>
        
        <div className="mt-2">
          <p className="font-medium">Option 2: Using the terminal</p>
          <code className="block mt-1 font-mono">
            cd text_to_pydough<br />
            source venv/bin/activate<br />
            llm keys set gemini
          </code>
        </div>
      </div>
    </div>
  );
};

// --- Re-introduce QueryResultsDisplay here or import if separate --- 
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
const QueryResultsDisplay = ({ results }: { results: string | null }) => {
  if (!results) return null;
  const containsHtml = results.trim().startsWith('<') && results.includes('>');
  if (containsHtml) {
    return (
      <div className="max-w-full overflow-x-auto">
        <style>{tableStyles}</style>
        <div dangerouslySetInnerHTML={{ __html: results }} />
      </div>
    );
  }
  return (
    <div className="max-w-full whitespace-pre-wrap font-mono text-sm overflow-x-auto">
      {results}
    </div>
  );
};
// --- End QueryResultsDisplay --- 

const QueryPage: React.FC = () => {
  const navigate = useNavigate();
  const { 
    connectionStatus, 
    currentQuery, 
    setCurrentQuery,
    processQuery,
    queryResults,
    availableDatabases,
    detectedDomain,
    generatedCode,
    generatedSQL,
    addHistoryItem,
    isLoading,
    error,
    setError,
    conversationHistory,
    clearConversationHistory,
    useLangGraph,
    setUseLangGraph,
    langGraphAvailable
  } = useAppContext();
  
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'results' | 'code' | 'sql'>('results');
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [needsApiKey, setNeedsApiKey] = useState(false);
  const [autoExecute, setAutoExecute] = useState<boolean>(true);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  
  // Redirect if not connected
  useEffect(() => {
    if (!connectionStatus) {
      navigate('/connect');
    }
  }, [connectionStatus, navigate]);
  
  // Set selectedDomain when detectedDomain changes
  useEffect(() => {
    if (detectedDomain) {
      setSelectedDomain(detectedDomain);
    }
  }, [detectedDomain]);
  
  // Update processingError when global error changes
  useEffect(() => {
    if (error) {
      setProcessingError(error);
    }
  }, [error]);
  
  // Check if API key is configured
  useEffect(() => {
    const checkApiStatus = async () => {
      try {
        const response = await fetch('http://localhost:5001/api/status');
        const data = await response.json();
        
        if (data.success && !data.llm_api_configured) {
          setNeedsApiKey(true);
          if (data.llm_error) {
            setProcessingError(data.llm_error);
          }
        }
      } catch (error) {
        console.error('Failed to check API status:', error);
      }
    };
    
    checkApiStatus();
  }, []);
  
  // Handle query submission
  const handleSubmitQuery = async () => {
    if (!currentQuery.trim()) return;
    
    console.log("handleSubmitQuery called in QueryPage.tsx");
    setProcessingError(null);
    setError(null);
    
    try {
      console.log(`Calling processQuery with autoExecute: ${autoExecute}`);
      const queryGenResult = await processQuery(currentQuery, autoExecute, selectedDomain);
      console.log("processQuery call finished in QueryPage.tsx");
      
      if (queryGenResult?.error && !queryGenResult?.success) {
        console.error("Error reported by processQuery:", queryGenResult.error);
        setProcessingError(`Error processing query: ${queryGenResult.error}`);
      } else {
        setProcessingError(null);
      }
      setActiveTab('results');
    } catch (err: any) {
      console.error('Error in handleSubmitQuery catch block:', err);
      setProcessingError(`Query processing error: ${err.message || err}`);
      setError(`Query processing error: ${err.message || err}`);
    }
  };
  
  // Handle saving to favorites
  const handleSaveFavorite = () => {
    if (!currentQuery.trim()) return;
    
    addHistoryItem({
      query: currentQuery,
      result: queryResults,
      favorite: true,
      tags: ['favorite'],
      domain: detectedDomain || undefined,
      pydoughCode: generatedCode || undefined,
      sql: generatedSQL || undefined
    });
    
    // Show a temporary success message
    const actionMessage = document.getElementById('action-message');
    if (actionMessage) {
      actionMessage.classList.remove('opacity-0');
      actionMessage.classList.add('opacity-100');
      
      setTimeout(() => {
        actionMessage.classList.remove('opacity-100');
        actionMessage.classList.add('opacity-0');
      }, 2000);
    }
  };
  
  // NEW: Handle starting a new conversation
  const handleNewConversation = () => {
    clearConversationHistory();
    setCurrentQuery(''); // Clear current query input
    // queryResults, generatedCode, generatedSQL are cleared in AppContext or will be on next query
    setProcessingError(null); // Clear local error display
    setError(null); // Clear global error
    console.log("New conversation started. History cleared.");
  };
  
  if (needsApiKey) {
    return <ApiKeySetup onKeySet={() => setNeedsApiKey(false)} />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Natural Language Query</h1>
          <p className="mt-2 text-sm text-gray-700">
            Ask questions about your data in plain English
          </p>
        </div>
        
        {/* Settings Button */}
        <button 
          onClick={() => setShowSettings(!showSettings)}
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          <Settings className="h-4 w-4 mr-2" />
          Settings
        </button>
      </div>
      
      {/* Settings Panel */}
      {showSettings && (
        <div className="mt-4 bg-gray-50 p-4 rounded-md border border-gray-200">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Query Settings</h3>
          <div className="space-y-4">
            {/* Auto-execute Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-gray-700">Auto-execute generated code</span>
                <p className="text-xs text-gray-500">Automatically run the generated PyDough code</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={autoExecute}
                onClick={() => setAutoExecute(!autoExecute)}
                className={`${
                  autoExecute ? 'bg-primary-600' : 'bg-gray-200'
                } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2`}
              >
                <span
                  aria-hidden="true"
                  className={`${
                    autoExecute ? 'translate-x-5' : 'translate-x-0'
                  } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                ></span>
              </button>
            </div>
            
            {/* LangGraph Toggle - Only show if available */}
            {langGraphAvailable && (
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-gray-700">Use LangGraph processing</span>
                  <p className="text-xs text-gray-500">Enhanced state management for better conversational context</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={useLangGraph}
                  onClick={() => setUseLangGraph(!useLangGraph)}
                  className={`${
                    useLangGraph ? 'bg-green-600' : 'bg-gray-200'
                  } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2`}
                >
                  <span
                    aria-hidden="true"
                    className={`${
                      useLangGraph ? 'translate-x-5' : 'translate-x-0'
                    } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                  ></span>
                </button>
              </div>
            )}
            
            {/* Domain Selection */}
            <div>
              <label htmlFor="domain-select" className="block text-sm font-medium text-gray-700">Domain selection</label>
              <select
                id="domain-select"
                value={selectedDomain || ''}
                onChange={(e) => setSelectedDomain(e.target.value || null)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
              >
                <option value="">Auto-detect domain</option>
                {availableDatabases.map((db) => (
                  <option key={db.name} value={db.name}>{db.name}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">Select a specific domain or let the system auto-detect</p>
            </div>
            
            {/* Clear Conversation */}
            <div>
              <button
                onClick={handleNewConversation}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <FileX className="h-4 w-4 mr-2" />
                Clear conversation history
              </button>
              <p className="mt-1 text-xs text-gray-500">Start a new conversation</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Update the error message if it still shows up */}
      {processingError && (processingError.includes("gemini-2.5-pro-preview-05-06") || processingError.includes("gemini-2.0-flash")) && (
        <div className="mt-4 bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <Key className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <strong>Gemini API Key Information:</strong><br/>
                This application uses two Gemini models for different purposes:<br/>
                - <strong>gemini-2.5-pro-preview-05-06</strong>: Used for generating PyDough code (complex queries)<br/>
                - <strong>gemini-2.0-flash</strong>: Used for domain detection and simpler tasks<br/><br/>
                Please ensure your API key has access to both models for full functionality.
              </p>
            </div>
          </div>
        </div>
      )}
      
      <div className="mt-6">
        <div className="flex flex-col md:flex-row md:items-center md:space-x-4">
          <div className="relative flex-1">
            <div className="flex rounded-md shadow-sm">
              <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">
                <ChevronRight className="h-5 w-5" />
              </span>
              <input
                type="text"
                value={currentQuery}
                onChange={(e) => setCurrentQuery(e.target.value)}
                placeholder="Enter your query in natural language (e.g., 'Show me top customers by order value')"
                className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                onKeyPress={(e) => e.key === 'Enter' && handleSubmitQuery()}
              />
            </div>
            
            <div id="action-message" className="absolute mt-2 text-sm text-green-600 opacity-0 transition-opacity duration-300 flex items-center">
              <CheckCircle className="h-4 w-4 mr-1" />
              Query saved to favorites
            </div>
          </div>
          
          <div className="mt-2 md:mt-0 flex-shrink-0">
            <div className="flex items-center space-x-2">
              {/* Domain selector dropdown removed - using auto-detection */}
              
              <button
                type="submit"
                onClick={handleSubmitQuery}
                disabled={isLoading || !currentQuery.trim()}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Run Query
                  </>
                )}
              </button>
              
              <button
                type="button"
                onClick={handleSaveFavorite}
                disabled={!currentQuery.trim()}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="h-4 w-4 mr-2" />
                Save
              </button>
            </div>
          </div>
        </div>
        
        {/* Add note about automatic domain detection */}
        <div className="mt-2 text-xs text-gray-500 italic">
          The system will automatically detect the most appropriate database domain for your query.
          {detectedDomain && (
            <span className="ml-1 text-primary-600 font-medium">
              Current domain: <span className="text-primary-700">{detectedDomain}</span>
            </span>
          )}
        </div>
      </div>
      
      {processingError && (
        <div className="mt-4 bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <FileX className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">
                {processingError}
              </p>
            </div>
          </div>
        </div>
      )}
      
      {(queryResults || generatedCode || generatedSQL) && (
        <div className="mt-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex">
              <button
                onClick={() => setActiveTab('results')}
                className={`${
                  activeTab === 'results'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm mr-8`}
              >
                Results
              </button>
              <button
                onClick={() => setActiveTab('code')}
                className={`${
                  activeTab === 'code'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm mr-8`}
              >
                PyDough Code
              </button>
              <button
                onClick={() => setActiveTab('sql')}
                className={`${
                  activeTab === 'sql'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                SQL
              </button>
            </nav>
          </div>
          
          <div className="mt-4">
            {activeTab === 'results' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-medium text-gray-900">
                    Query Results
                    {detectedDomain && (
                      <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        <Database className="h-3 w-3 mr-1" />
                        {detectedDomain}
                      </span>
                    )}
                  </h2>
                  
                  <button
                    type="button"
                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    disabled={!queryResults}
                  >
                    <Download className="h-3.5 w-3.5 mr-1" />
                    Export
                  </button>
                </div>
                
                {queryResults ? (
                  <QueryResultsDisplay results={queryResults} />
                ) : (
                  <p className="text-gray-500 italic">No results to display</p>
                )}
              </div>
            )}
            
            {activeTab === 'code' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-medium text-gray-900">PyDough Code</h2>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={handleSubmitQuery}
                      disabled={isLoading || !generatedCode}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent shadow-sm text-xs font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-1 h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Executing...
                        </>
                      ) : (
                        <>
                          <Play className="h-3.5 w-3.5 mr-1" />
                          Execute
                        </>
                      )}
                    </button>
                    
                    <button
                      type="button"
                      className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                      disabled={!generatedCode}
                    >
                      <Code className="h-3.5 w-3.5 mr-1" />
                      Copy
                    </button>
                  </div>
                </div>
                
                {generatedCode ? (
                  <div className="border border-gray-300 rounded-md overflow-hidden">
                    <Editor
                      height="300px"
                      language="python"
                      value={generatedCode}
                      options={{
                        readOnly: false,
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                      }}
                    />
                  </div>
                ) : (
                  <p className="text-gray-500 italic">No code to display</p>
                )}
              </div>
            )}
            
            {activeTab === 'sql' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-medium text-gray-900">Generated SQL</h2>
                  
                  <button
                    type="button"
                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    disabled={!generatedSQL}
                  >
                    <Code className="h-3.5 w-3.5 mr-1" />
                    Copy
                  </button>
                </div>
                
                {generatedSQL ? (
                  <div className="border border-gray-300 rounded-md overflow-hidden">
                    <Editor
                      height="200px"
                      language="sql"
                      value={generatedSQL}
                      options={{
                        readOnly: true,
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                      }}
                    />
                  </div>
                ) : (
                  <p className="text-gray-500 italic">No SQL to display</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      
      <div className="mt-8 bg-white shadow sm:rounded-md p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Sample Queries</h2>
        
        <div className="bg-gray-50 p-4 rounded-md">
          <p className="text-sm text-gray-600 mb-4">
            Try these sample queries to get started:
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {detectedDomain && (
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">For {detectedDomain}:</h3>
                <ul className="space-y-2">
                  {detectedDomain === 'Broker' && (
                    <>
                      <li>
                        <button 
                          onClick={() => setCurrentQuery("List all customers and their email addresses")}
                          className="text-left text-sm text-primary-600 hover:text-primary-500"
                        >
                          List all customers and their email addresses
                        </button>
                      </li>
                      <li>
                        <button 
                          onClick={() => setCurrentQuery("Show me the top 5 stocks by trading volume")}
                          className="text-left text-sm text-primary-600 hover:text-primary-500"
                        >
                          Show me the top 5 stocks by trading volume
                        </button>
                      </li>
                    </>
                  )}
                  
                  {detectedDomain === 'Dealership' && (
                    <>
                      <li>
                        <button 
                          onClick={() => setCurrentQuery("List all car models with their prices")}
                          className="text-left text-sm text-primary-600 hover:text-primary-500"
                        >
                          List all car models with their prices
                        </button>
                      </li>
                      <li>
                        <button 
                          onClick={() => setCurrentQuery("Show top 5 salespeople by revenue")}
                          className="text-left text-sm text-primary-600 hover:text-primary-500"
                        >
                          Show top 5 salespeople by revenue
                        </button>
                      </li>
                    </>
                  )}
                  
                  {detectedDomain === 'DermTreatment' && (
                    <>
                      <li>
                        <button 
                          onClick={() => setCurrentQuery("List all doctors and their specialties")}
                          className="text-left text-sm text-primary-600 hover:text-primary-500"
                        >
                          List all doctors and their specialties
                        </button>
                      </li>
                      <li>
                        <button 
                          onClick={() => setCurrentQuery("Show most common patient diagnoses")}
                          className="text-left text-sm text-primary-600 hover:text-primary-500"
                        >
                          Show most common patient diagnoses
                        </button>
                      </li>
                    </>
                  )}
                  
                  {detectedDomain === 'Ewallet' && (
                    <>
                      <li>
                        <button 
                          onClick={() => setCurrentQuery("Show me all transactions over $1000")}
                          className="text-left text-sm text-primary-600 hover:text-primary-500"
                        >
                          Show me all transactions over $1000
                        </button>
                      </li>
                      <li>
                        <button 
                          onClick={() => setCurrentQuery("List users with highest wallet balance")}
                          className="text-left text-sm text-primary-600 hover:text-primary-500"
                        >
                          List users with highest wallet balance
                        </button>
                      </li>
                    </>
                  )}
                  
                  {detectedDomain === 'TPCH' && (
                    <>
                      <li>
                        <button 
                          onClick={() => setCurrentQuery("List all suppliers and their regions")}
                          className="text-left text-sm text-primary-600 hover:text-primary-500"
                        >
                          List all suppliers and their regions
                        </button>
                      </li>
                      <li>
                        <button 
                          onClick={() => setCurrentQuery("Show orders with highest line item count")}
                          className="text-left text-sm text-primary-600 hover:text-primary-500"
                        >
                          Show orders with highest line item count
                        </button>
                      </li>
                    </>
                  )}
                </ul>
              </div>
            )}
            
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">General Queries:</h3>
              <ul className="space-y-2">
                <li>
                  <button 
                    onClick={() => setCurrentQuery("Show me the total count of records in each table")}
                    className="text-left text-sm text-primary-600 hover:text-primary-500"
                  >
                    Show me the total count of records in each table
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => setCurrentQuery("What is the most recent transaction in the database?")}
                    className="text-left text-sm text-primary-600 hover:text-primary-500"
                  >
                    What is the most recent transaction in the database?
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => setCurrentQuery("Create a summary report of key metrics")}
                    className="text-left text-sm text-primary-600 hover:text-primary-500"
                  >
                    Create a summary report of key metrics
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      
      {/* Optional: Display Conversation History for Debugging */}
      {conversationHistory.length > 0 && (
        <div className="mt-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
          <h3 className="text-md font-semibold text-gray-600 mb-2">Conversation Log (Debug):</h3>
          <div className="max-h-60 overflow-y-auto text-xs">
            {conversationHistory.map((turn, index) => (
              <div key={index} className={`mb-2 p-2 rounded ${turn.role === 'user' ? 'bg-blue-50' : 'bg-green-50'}`}>
                <p className="font-semibold capitalize">{turn.role}:</p>
                <pre className="whitespace-pre-wrap break-all">{turn.content}</pre>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default QueryPage; 