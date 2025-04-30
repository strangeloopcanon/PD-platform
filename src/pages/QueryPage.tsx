import React, { useState, useRef, useEffect } from 'react';
import { Play, Code, Database, ArrowRight, RefreshCw, Download, Copy, CheckCircle2, AlertCircle, Send, MessageSquare, Lightbulb, ChevronRight, BookOpen } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import Editor from '@monaco-editor/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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
  const [isExecuting, setIsExecuting] = useState(false);
  const [activeTab, setActiveTab] = useState<'pydough' | 'sql'>('pydough');
  const [currentMessage, setCurrentMessage] = useState('');
  const [showExplanation, setShowExplanation] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

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
      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
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
                      <div className="mt-4 bg-gray-50 rounded-md overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              {Object.keys(message.results[0]).map((key) => (
                                <th
                                  key={key}
                                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                >
                                  {key}
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

        {/* Input area */}
        <div className="border-t border-gray-200 px-4 py-4 bg-white">
          <div className="max-w-4xl mx-auto">
            <div className="relative">
              <textarea
                rows={2}
                className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                placeholder="Ask a question about your data..."
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                onKeyDown={handleKeyPress}
              />
              <button
                className="absolute right-2 bottom-2 inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
                onClick={() => executeQuery(currentMessage)}
                disabled={isExecuting || !currentMessage.trim()}
              >
                {isExecuting ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Copilot panel */}
      <div className={`border-l border-gray-200 bg-white ${copilotOpen ? 'w-80' : 'w-10'} transition-all duration-300 flex flex-col`}>
        {copilotOpen ? (
          <>
            <div className="border-b border-gray-200 px-4 py-4 flex justify-between items-center">
              <div className="flex items-center">
                <Lightbulb className="h-5 w-5 text-amber-500 mr-2" />
                <h3 className="text-sm font-medium text-gray-900">Query Assistant</h3>
              </div>
              <button
                type="button"
                className="text-gray-400 hover:text-gray-500"
                onClick={() => setCopilotOpen(false)}
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wider mb-2">
                  Suggested Queries
                </h4>
                <div className="space-y-2">
                  {[
                    "Show me sales trends by category over the last 6 months",
                    "What are the top 5 products by revenue?",
                    "Compare customer segments by average order value",
                    "Analyze order patterns by day of week",
                  ].map((suggestion, index) => (
                    <button
                      key={index}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-md"
                      onClick={() => setCurrentMessage(suggestion)}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wider mb-2">
                  Quick Tips
                </h4>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li className="flex items-start">
                    <span className="text-primary-500 mr-2">•</span>
                    Use natural language to describe your data needs
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary-500 mr-2">•</span>
                    Specify time ranges for temporal analysis
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary-500 mr-2">•</span>
                    Ask for specific visualizations in the notebook
                  </li>
                </ul>
              </div>
              
              <div className="bg-gray-50 p-3 rounded-md">
                <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wider mb-2">
                  Available Tables
                </h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li className="flex items-center">
                    <Database className="h-4 w-4 text-gray-400 mr-1" />
                    CUSTOMERS
                  </li>
                  <li className="flex items-center">
                    <Database className="h-4 w-4 text-gray-400 mr-1" />
                    ORDERS
                  </li>
                  <li className="flex items-center">
                    <Database className="h-4 w-4 text-gray-400 mr-1" />
                    PRODUCTS
                  </li>
                </ul>
              </div>
            </div>
          </>
        ) : (
          <button
            className="flex items-center justify-center h-full w-full hover:bg-gray-50"
            onClick={() => setCopilotOpen(true)}
          >
            <Lightbulb className="h-5 w-5 text-amber-500" />
          </button>
        )}
      </div>
    </div>
  );
};

export default QueryPage;