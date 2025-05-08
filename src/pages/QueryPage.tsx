import React, { useState, useRef, useEffect } from 'react';
import { Play, Code, Database, ArrowRight, RefreshCw, Download, Copy, CheckCircle2, AlertCircle, Send, MessageSquare, Lightbulb, ChevronRight, BookOpen, ChevronUp, ChevronDown, Filter, ChevronsLeft, ChevronsRight, BarChart3, History } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import Editor from '@monaco-editor/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import toast, { Toaster } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import QueryHistory from '../components/QueryHistory';
import ConversationVisualizer from '../components/ConversationVisualizer';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  code?: {
    pydough: string;
    sql: string;
  };
  explanation?: string;
  results?: any[];
}

const QueryPage: React.FC = () => {
  const { connectionStatus, queryHistory, addQueryMessage, setSelectedDataFrame } = useAppContext();
  const navigate = useNavigate();
  const [isExecuting, setIsExecuting] = useState(false);
  const [activeTab, setActiveTab] = useState<'pydough' | 'sql'>('pydough');
  const [currentMessage, setCurrentMessage] = useState('');
  const [showExplanation, setShowExplanation] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [loadingSuggestion, setLoadingSuggestion] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'chat' | 'conversation'>('chat');

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [queryHistory]);

  const executeQuery = async (message: string) => {
    if (!message.trim()) return;
    
    setIsExecuting(true);
    setError(null);
    
    // Add user message
    addQueryMessage({
      role: 'user',
      content: message,
    });

    // Simulate query processing
    setTimeout(() => {
      const mockPydoughCode = `
from pydough import Table, Query

customers = Table("CUSTOMERS")
orders = Table("ORDERS")
products = Table("PRODUCTS")

query = (
    Query()
    .from_(orders)
    .join(customers, orders.CUSTOMER_ID == customers.CUSTOMER_ID)
    .join(products, orders.PRODUCT_ID == products.PRODUCT_ID)
    .select([
        products.CATEGORY.alias("category"),
        Query.sum(orders.TOTAL_AMOUNT).alias("total_sales")
    ])
    .group_by(products.CATEGORY)
    .order_by(Query.sum(orders.TOTAL_AMOUNT).desc())
)`.trim();

      const mockSqlCode = `
SELECT 
  products.CATEGORY as category,
  SUM(orders.TOTAL_AMOUNT) as total_sales
FROM 
  ORDERS orders
JOIN 
  CUSTOMERS customers ON orders.CUSTOMER_ID = customers.CUSTOMER_ID
JOIN 
  PRODUCTS products ON orders.PRODUCT_ID = products.PRODUCT_ID
GROUP BY 
  products.CATEGORY
ORDER BY 
  SUM(orders.TOTAL_AMOUNT) DESC;`.trim();

      const mockResults = [
        { category: 'Electronics', total_sales: 527350.75 },
        { category: 'Home & Kitchen', total_sales: 423150.25 },
        { category: 'Clothing', total_sales: 356280.50 },
      ];

      const mockExplanation = `
This query analyzes sales data by product category. Here's what it does:

1. Joins three tables: ORDERS, CUSTOMERS, and PRODUCTS
2. Groups the data by product category
3. Calculates total sales for each category
4. Orders the results by total sales in descending order

The PyDough code uses our custom DSL to create a more readable and maintainable query structure, which is then automatically translated to SQL for execution.

Key operations:
- Table joins to connect related data
- Aggregation using SUM()
- Grouping by category
- Sorting by total sales

The results show that Electronics is the top-performing category, followed by Home & Kitchen and Clothing.
`.trim();

      addQueryMessage({
        role: 'assistant',
        content: 'I\'ve analyzed your request and generated the following query:',
        code: {
          pydough: mockPydoughCode,
          sql: mockSqlCode,
        },
        explanation: mockExplanation,
        results: mockResults,
      });

      setIsExecuting(false);
      setCurrentMessage('');
      setSelectedDataFrame(mockResults);
    }, 1500);
  };

  const copyToClipboard = (code: string, type: 'pydough' | 'sql') => {
    navigator.clipboard.writeText(code);
    setCopiedCode(type);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      executeQuery(currentMessage);
    }
  };

  // Mock handler for Export Results
  const handleExportResults = () => {
    toast.success('Results export started... (Mock)');
  };

  // Mock handler for Analyze in Notebook
  const handleAnalyzeInNotebook = (results: any[]) => {
    setSelectedDataFrame(results); // Set results in context (implementation needed in context)
    navigate('/notebook'); // Navigate to notebook page
    toast.success('Sending results to Notebook... (Mock)');
  };

  // Handle clicking a suggestion
  const handleSuggestionClick = (suggestion: string) => {
    setLoadingSuggestion(suggestion);
    setTimeout(() => {
      setCurrentMessage(suggestion);
      setLoadingSuggestion(null);
    }, 300); // Short delay to show loading state
  };

  if (!connectionStatus) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <h2 className="text-xl font-medium text-gray-900">Database Connection Required</h2>
          <p className="mt-2 text-sm text-gray-500">
            Please connect to a Snowflake database before using the query interface
          </p>
          <a href="/connect" className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700">
            Connect to Database
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-7rem)] flex">
      <Toaster position="top-center" reverseOrder={false} />
      
      {/* Left sidebar with query history */}
      <div className="w-80 border-r border-gray-200 h-full overflow-y-auto bg-gray-50 p-4 hidden lg:block">
        <QueryHistory />
      </div>
      
      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {/* Tab selector for different views */}
        <div className="border-b border-gray-200 bg-white">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveView('chat')}
              className={`${
                activeView === 'chat'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              Chat
            </button>
            <button
              onClick={() => setActiveView('conversation')}
              className={`${
                activeView === 'conversation'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
            >
              <History className="mr-2 h-4 w-4" />
              Conversation History
            </button>
          </nav>
        </div>
        
        {activeView === 'chat' ? (
          <>
            {/* Chat messages */}
            <div className="flex-1 overflow-y-auto px-4 py-6">
              <div className="max-w-4xl mx-auto space-y-6">
                {queryHistory.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No messages</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Start by asking a question about your data
                    </p>
                  </div>
                ) : (
                  queryHistory.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`rounded-lg px-4 py-2 max-w-3xl ${
                          message.role === 'user'
                            ? 'bg-primary-600 text-white'
                            : 'bg-white shadow-sm border border-gray-200'
                        }`}
                      >
                        <div className="text-sm">{message.content}</div>
                        
                        {message.code && (
                          <div className="mt-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex space-x-2">
                                <button
                                  className={`px-2 py-1 text-xs rounded ${
                                    activeTab === 'pydough'
                                      ? 'bg-gray-200 text-gray-800'
                                      : 'text-gray-600 hover:bg-gray-100'
                                  }`}
                                  onClick={() => setActiveTab('pydough')}
                                  title="View generated PyDough code (Custom DSL)"
                                >
                                  PyDough
                                </button>
                                <button
                                  className={`px-2 py-1 text-xs rounded ${
                                    activeTab === 'sql'
                                      ? 'bg-gray-200 text-gray-800'
                                      : 'text-gray-600 hover:bg-gray-100'
                                  }`}
                                  onClick={() => setActiveTab('sql')}
                                  title="View generated SQL code"
                                >
                                  SQL
                                </button>
                              </div>
                              <button
                                className="p-1 text-gray-400 hover:text-gray-600"
                                onClick={() => copyToClipboard(
                                  activeTab === 'pydough' ? message.code!.pydough : message.code!.sql,
                                  activeTab
                                )}
                              >
                                {copiedCode === activeTab ? (
                                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                            <div className="relative">
                              <Editor
                                height="200px"
                                language={activeTab === 'pydough' ? 'python' : 'sql'}
                                value={activeTab === 'pydough' ? message.code.pydough : message.code.sql}
                                options={{
                                  readOnly: true,
                                  minimap: { enabled: false },
                                  scrollBeyondLastLine: false,
                                  fontSize: 12,
                                }}
                              />
                            </div>
                          </div>
                        )}
                        
                        {message.results && (
                          <div className="mt-4">
                            {/* Results Table Header Actions */}
                            <div className="mb-2 flex justify-end space-x-2">
                              <button
                                className="inline-flex items-center px-2 py-1 border border-gray-300 rounded-md text-xs font-medium text-gray-700 bg-white hover:bg-gray-50"
                                onClick={() => handleAnalyzeInNotebook(message.results!)}
                                title="Send results to a new Notebook for analysis"
                              >
                                <BarChart3 className="h-3.5 w-3.5 mr-1" />
                                Analyze in Notebook
                              </button>
                              <button
                                className="inline-flex items-center px-2 py-1 border border-gray-300 rounded-md text-xs font-medium text-gray-700 bg-white hover:bg-gray-50"
                                onClick={handleExportResults}
                              >
                                <Download className="h-3.5 w-3.5 mr-1" />
                                Export Results
                              </button>
                            </div>
                            <div className="bg-gray-50 rounded-md overflow-x-auto border border-gray-200">
                              <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                  <tr>
                                    {Object.keys(message.results[0]).map((key) => (
                                      <th
                                        key={key}
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider group cursor-pointer hover:bg-gray-100"
                                      >
                                        <div className="flex items-center justify-between">
                                          <span>{key}</span>
                                          {/* Mock Sort/Filter Icons */}
                                          <span className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                            <Filter className="h-3 w-3 inline text-gray-400 mr-1" />
                                            <ChevronUp className="h-3 w-3 inline text-gray-400" />
                                            {/* <ChevronDown className="h-3 w-3 inline text-gray-400" /> */}
                                          </span>
                                        </div>
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {message.results.map((row, idx) => (
                                    <tr key={idx}>
                                      {Object.values(row).map((value, valueIdx) => (
                                        <td
                                          key={valueIdx}
                                          className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                                        >
                                          {typeof value === 'number'
                                            ? value.toLocaleString(undefined, {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2,
                                              })
                                            : String(value)}
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            {/* Mock Pagination Controls */}
                            <div className="mt-2 flex items-center justify-between text-sm text-gray-600">
                              <button className="inline-flex items-center px-2 py-1 border border-gray-300 rounded-md text-gray-500 bg-white hover:bg-gray-50 disabled:opacity-50" disabled>
                                <ChevronsLeft className="h-4 w-4 mr-1" /> Previous
                              </button>
                              <span>Page 1 of 1 (Mock)</span>
                              <button className="inline-flex items-center px-2 py-1 border border-gray-300 rounded-md text-gray-500 bg-white hover:bg-gray-50 disabled:opacity-50" disabled>
                                Next <ChevronsRight className="h-4 w-4 ml-1" />
                              </button>
                            </div>
                          </div>
                        )}
                        
                        {message.explanation && (
                          <div className="mt-4">
                            <button
                              className="inline-flex items-center text-xs text-gray-500 hover:text-gray-700"
                              onClick={() => setShowExplanation(!showExplanation)}
                            >
                              <BookOpen className="h-4 w-4 mr-1" />
                              {showExplanation ? 'Hide' : 'Show'} Explanation
                            </button>
                            {showExplanation && (
                              <div className="mt-2 text-sm text-gray-600 bg-gray-50 rounded-md p-4">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                  {message.explanation}
                                </ReactMarkdown>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
                <div ref={chatEndRef} />
              </div>
            </div>

            {/* Query input */}
            <div className="border-t border-gray-200 py-4 px-4 bg-white">
              <div className="max-w-4xl mx-auto">
                <form className="relative">
                  <div className="border border-gray-300 rounded-lg shadow-sm overflow-hidden focus-within:border-primary-500 focus-within:ring-1 focus-within:ring-primary-500">
                    <textarea
                      rows={3}
                      name="query"
                      id="query"
                      className="block w-full py-3 px-4 border-0 resize-none focus:ring-0 sm:text-sm"
                      placeholder="Ask a question about your data..."
                      value={currentMessage}
                      onChange={(e) => setCurrentMessage(e.target.value)}
                      onKeyDown={handleKeyPress}
                      disabled={isExecuting}
                    />
                  </div>
                  <div className="absolute inset-x-0 bottom-0 flex justify-between py-2 pl-3 pr-2">
                    <div className="flex items-center space-x-5">
                      {error && (
                        <div className="text-red-500 text-xs flex items-center">
                          <AlertCircle className="h-4 w-4 mr-1" />
                          {error}
                        </div>
                      )}
                    </div>
                    <div>
                      <button
                        type="button"
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                        onClick={() => executeQuery(currentMessage)}
                        disabled={isExecuting || !currentMessage.trim()}
                      >
                        {isExecuting ? (
                          <>
                            <RefreshCw className="animate-spin -ml-1 mr-2 h-4 w-4" />
                            Processing
                          </>
                        ) : (
                          <>
                            <Send className="-ml-1 mr-2 h-4 w-4" />
                            Send
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </form>

                {/* Query suggestions */}
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-500 flex items-center">
                    <Lightbulb className="h-4 w-4 mr-1 text-amber-500" />
                    Query Suggestions
                  </h4>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {[
                      "What were the top 5 selling products last month?",
                      "Show me customer retention rate by month",
                      "Compare sales by region for the last 4 quarters",
                      "Which product categories are growing the fastest?",
                      "Show me trends in customer acquisition cost"
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        className={`text-xs px-2.5 py-1.5 rounded-full border border-gray-300 bg-white hover:bg-gray-50 ${
                          loadingSuggestion === suggestion ? 'animate-pulse bg-gray-100' : ''
                        }`}
                        onClick={() => handleSuggestionClick(suggestion)}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="p-6 flex-1 overflow-y-auto">
            <ConversationVisualizer />
          </div>
        )}
      </div>

      {/* Right sidebar with copilot */}
      <div className="w-96 border-l border-gray-200 h-full overflow-y-auto bg-gray-50 hidden xl:block">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h3 className="text-sm font-medium text-gray-900 flex items-center">
            <Lightbulb className="h-4 w-4 mr-1.5 text-amber-500" />
            SQL Copilot
          </h3>
          <button
            onClick={() => setCopilotOpen(!copilotOpen)}
            className="text-gray-400 hover:text-gray-500"
          >
            {copilotOpen ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
          </button>
        </div>
        
        {copilotOpen && (
          <div className="p-4">
            <div className="bg-amber-50 rounded-lg border border-amber-100 p-4 mb-4">
              <h4 className="text-sm font-medium text-amber-800 flex items-center">
                <Lightbulb className="h-4 w-4 mr-1.5" />
                SQL Tip
              </h4>
              <p className="mt-1 text-xs text-amber-700">
                When analyzing time-based data, consider using the OVER clause with PARTITION BY to create 
                running totals or moving averages without complex self-joins.
              </p>
            </div>
            
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Related Schemas</h4>
                <ul className="mt-2 divide-y divide-gray-200">
                  {['ORDERS', 'CUSTOMERS', 'PRODUCTS'].map((table) => (
                    <li key={table} className="py-2">
                      <button className="flex items-center text-sm text-gray-800 hover:text-primary-600">
                        <Database className="h-4 w-4 mr-1.5 text-gray-400" />
                        {table}
                        <ChevronRight className="ml-auto h-4 w-4 text-gray-400" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Common Functions</h4>
                <ul className="mt-2 grid grid-cols-2 gap-2">
                  {['SUM()', 'AVG()', 'COUNT()', 'GROUP BY', 'ORDER BY', 'HAVING'].map((func) => (
                    <li key={func}>
                      <button className="text-xs px-2 py-1 bg-white border border-gray-200 rounded hover:bg-gray-50 text-gray-800">
                        {func}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Resources</h4>
                <ul className="mt-2 space-y-2">
                  <li>
                    <a href="#" className="flex items-center text-xs text-primary-600 hover:text-primary-700">
                      <BookOpen className="h-3 w-3 mr-1" />
                      SQL Best Practices Guide
                    </a>
                  </li>
                  <li>
                    <a href="#" className="flex items-center text-xs text-primary-600 hover:text-primary-700">
                      <BookOpen className="h-3 w-3 mr-1" />
                      Snowflake Function Reference
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QueryPage;
