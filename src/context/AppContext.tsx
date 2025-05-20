import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

// Define domain interface based on PyDough's DOMAINS
interface Domain {
  name: string;
  keywords: string[];
  metadataFile: string;
  databaseFile: string;
  connected: boolean;
  exists?: boolean;
}

interface QueryMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  code?: {
    pydough: string;
    sql: string;
  };
  explanation?: string;
  results?: any[];
}

interface HistoryItem {
  id: string;
  query: string;
  timestamp: Date;
  result: any | null;
  favorite: boolean;
  tags: string[];
  domain?: string;
  pydoughCode?: string;
  sql?: string;
}

// Type for individual conversation turns
interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
}

// New interface for database metadata
interface DomainMetadata {
  tables: any[];
  relationships: any[];
  [key: string]: any;
}

// API endpoints
// Allow overriding the backend URL via Vite environment variable
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5001/api";

interface AppContextProps {
  // Original properties
  connectionStatus: boolean;
  setConnectionStatus: (status: boolean) => void;
  metadata: any[] | null;
  setMetadata: (data: any[] | null) => void;
  currentQuery: string;
  setCurrentQuery: (query: string) => void;
  queryResults: any | null;
  setQueryResults: (results: any | null) => void;
  queryHistory: QueryMessage[];
  addQueryMessage: (message: Omit<QueryMessage, 'id' | 'timestamp'>) => void;
  selectedDataFrame: any | null;
  setSelectedDataFrame: (df: any | null) => void;
  queryHistoryItems: HistoryItem[];
  addHistoryItem: (item: Omit<HistoryItem, 'id' | 'timestamp'>) => void;
  toggleFavorite: (id: string) => void;
  addTagToHistory: (id: string, tag: string) => void;
  removeTagFromHistory: (id: string, tag: string) => void;
  
  // New properties for PyDough integration
  availableDatabases: Domain[];
  scanDatabases: () => Promise<void>;
  domainMetadata: Record<string, DomainMetadata | null>;
  loadDomainMetadata: (domain: string) => Promise<void>;
  detectedDomain: string | null;
  setDetectedDomain: (domain: string | null) => void;
  generatedCode: string | null;
  setGeneratedCode: (code: string | null) => void;
  generatedSQL: string | null;
  setGeneratedSQL: (sql: string | null) => void;
  connectDatabase: (domain: string) => Promise<boolean>;
  processQuery: (query: string, execute: boolean, domain: string | null) => Promise<any>;
  isLoading: boolean;
  error: string | null;
  setError: (error: string | null) => void;
  
  // New properties for Conversation History
  conversationHistory: ConversationTurn[];
  clearConversationHistory: () => void;
  
  // LangGraph support
  useLangGraph: boolean;
  setUseLangGraph: (use: boolean) => void;
  langGraphAvailable: boolean;
}

const AppContext = createContext<AppContextProps | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Original state
  const [connectionStatus, setConnectionStatus] = useState<boolean>(false);
  const [metadata, setMetadata] = useState<any[] | null>(null);
  const [currentQuery, setCurrentQuery] = useState<string>('');
  const [queryResults, setQueryResults] = useState<any | null>(null);
  const [queryHistory, setQueryHistory] = useState<QueryMessage[]>([]);
  const [selectedDataFrame, setSelectedDataFrame] = useState<any | null>(null);
  
  // New state for PyDough integration
  const [availableDatabases, setAvailableDatabases] = useState<Domain[]>([]);
  const [domainMetadata, setDomainMetadata] = useState<Record<string, DomainMetadata | null>>({});
  const [detectedDomain, setDetectedDomain] = useState<string | null>(null);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [generatedSQL, setGeneratedSQL] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // State for Conversation History
  const [conversationHistory, setConversationHistory] = useState<ConversationTurn[]>([]);
  
  // LangGraph support
  const [useLangGraph, setUseLangGraph] = useState<boolean>(false);
  const [langGraphAvailable, setLangGraphAvailable] = useState<boolean>(false);

  // Load demo history items from localStorage
  const [queryHistoryItems, setQueryHistoryItems] = useState<HistoryItem[]>(() => {
    try {
      const savedItems = localStorage.getItem('demoHistoryItems');
      return savedItems ? JSON.parse(savedItems) : [];
    } catch (error) {
      console.error('Error loading demo history items:', error);
      return [];
    }
  });

  // Original methods
  const addQueryMessage = (message: Omit<QueryMessage, 'id' | 'timestamp'>) => {
    const newMessage: QueryMessage = {
      ...message,
      id: Date.now().toString(),
      timestamp: new Date(),
    };
    setQueryHistory(prev => [...prev, newMessage]);
  };

  const addHistoryItem = (item: Omit<HistoryItem, 'id' | 'timestamp'>) => {
    const newItem: HistoryItem = {
      ...item,
      id: Date.now().toString(),
      timestamp: new Date(),
    };
    setQueryHistoryItems(prev => [newItem, ...prev]);
    
    // Save to localStorage
    try {
      localStorage.setItem('demoHistoryItems', JSON.stringify([newItem, ...queryHistoryItems]));
    } catch (error) {
      console.error('Error saving history items:', error);
    }
  };

  const toggleFavorite = (id: string) => {
    const updatedItems = queryHistoryItems.map(item => 
      item.id === id ? { ...item, favorite: !item.favorite } : item
    );
    
    setQueryHistoryItems(updatedItems);
    
    // Save to localStorage
    try {
      localStorage.setItem('demoHistoryItems', JSON.stringify(updatedItems));
    } catch (error) {
      console.error('Error saving history items:', error);
    }
  };

  const addTagToHistory = (id: string, tag: string) => {
    const updatedItems = queryHistoryItems.map(item => 
      item.id === id ? { ...item, tags: [...item.tags, tag] } : item
    );
    
    setQueryHistoryItems(updatedItems);
    
    // Save to localStorage
    try {
      localStorage.setItem('demoHistoryItems', JSON.stringify(updatedItems));
    } catch (error) {
      console.error('Error saving history items:', error);
    }
  };

  const removeTagFromHistory = (id: string, tag: string) => {
    const updatedItems = queryHistoryItems.map(item => 
      item.id === id ? { ...item, tags: item.tags.filter(t => t !== tag) } : item
    );
    
    setQueryHistoryItems(updatedItems);
    
    // Save to localStorage
    try {
      localStorage.setItem('demoHistoryItems', JSON.stringify(updatedItems));
    } catch (error) {
      console.error('Error saving history items:', error);
    }
  };

  // New methods for PyDough integration
  
  // Scan for available databases
  const scanDatabases = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/databases`);
      const data = await response.json();
      
      if (data.success) {
        // Convert the databases to include connection status
        const databasesWithStatus = data.databases.map((db: any) => ({
          ...db,
          connected: false
        }));
        
        setAvailableDatabases(databasesWithStatus);
      } else {
        setError(data.error || "Failed to load databases");
      }
    } catch (error) {
      console.error("Error scanning databases:", error);
      // Provide a more helpful error message when the backend is down
      setError("Could not connect to backend API. Please ensure the Python backend is running (./start.sh)");
      
      // Set empty database list in case of error
      setAvailableDatabases([]);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Load metadata for a specific domain
  const loadDomainMetadata = async (domain: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/metadata/${domain}`);
      const data = await response.json();
      
      if (data.success) {
        // Store the metadata in state
        setDomainMetadata(prev => ({
          ...prev,
          [domain]: data.metadata
        }));
        
      } else {
        setError(data.error || `Failed to load metadata for ${domain}`);
      }
    } catch (error) {
      console.error(`Error loading metadata for domain ${domain}:`, error);
      setError(`Error loading metadata for ${domain}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Connect to a specific database
  const connectDatabase = async (domain: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ domain })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Update connection status for the specific database
        setAvailableDatabases(prev => 
          prev.map(db => 
            db.name === domain 
              ? { ...db, connected: true } 
              : db
          )
        );
        
        // Set overall connection status
        setConnectionStatus(true);
        
        // Set as the current detected domain
        setDetectedDomain(domain);
        
        // Load metadata for this domain
        await loadDomainMetadata(domain);
        
        return true;
      } else {
        console.error(`Failed to connect to ${domain}:`, data.error);
        setError(data.error || `Failed to connect to ${domain}`);
        return false;
      }
    } catch (error) {
      console.error(`Error connecting to database ${domain}:`, error);
      setError(`Error connecting to ${domain}`);
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Scan for available databases and get initial API status
  useEffect(() => {
    const checkAPIStatus = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/status`);
        const data = await response.json();
        
        // Check if LangGraph is available
        setLangGraphAvailable(!!data.langgraph_available);
        
        // Proceed with database scanning
        scanDatabases();
      } catch (error) {
        console.error("Failed to check API status:", error);
        setError("Failed to connect to backend API");
      }
    };
    
    checkAPIStatus();
  }, []);

  // Process a natural language query
  const processQuery = async (query: string, execute: boolean, domain: string | null = null): Promise<any> => {
    setIsLoading(true);
    setError(null);
    setGeneratedCode(null);
    setGeneratedSQL(null);
    setQueryResults(null); // Clear previous results
    
    // Add user query to conversation history
    const userTurn: ConversationTurn = { role: 'user', content: query };
    const currentHistory = [...conversationHistory, userTurn]; // Use updated history for API call
    setConversationHistory(currentHistory); // Update state immediately
    
    try {
      // Choose endpoint based on useLangGraph setting
      const endpoint = useLangGraph ? `${API_BASE_URL}/query-lg` : `${API_BASE_URL}/query`;
      
      // Prepare request body based on selected endpoint
      const requestBody = useLangGraph ? 
        {
          query: query,
          execute: execute,
          domain: domain,
          history: conversationHistory.map(turn => ({
            role: turn.role,
            content: turn.content
          }))
        } : 
        {
          query_text: query,
          domain: domain,
          history: conversationHistory,
          execute: execute
        };
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      
      const data = await response.json();
      
      // Detect and handle executeCode error here
      window.addEventListener('error', (event) => {
        // If we see the specific executeCode error, prevent it from showing in the console
        if (event.message && event.message.includes('executeCode is not a function')) {
          event.preventDefault();
          console.warn('Suppressed executeCode error - this is a known issue being fixed');
        }
      }, { once: true });
      
      // Handle LangGraph response format which differs from regular API
      if (useLangGraph) {
        if (data.success) {
          setGeneratedCode(data.pydough_code || null);
          
          // Handle execution results
          let sqlResult = null;
          let dataResult = null;
          
          if (data.execution) {
            // Extract SQL from execution result
            if (data.execution.sql) {
              sqlResult = data.execution.sql;
            }
            
            // Extract data results
            if (data.execution.result_data) {
              const rd = data.execution.result_data;
              if (rd.pandas_df) {
                // Format pandas dataframe as HTML table
                dataResult = `<div class="results-html">${rd.pandas_df}</div>`;
              } else if (rd.result_str) {
                dataResult = rd.result_str;
              }

              // Parse dataframe JSON for notebook usage
              if (rd.pandas_df_json) {
                try {
                  const dfObj = JSON.parse(rd.pandas_df_json);
                  setSelectedDataFrame(dfObj);
                } catch (e) {
                  console.warn('Failed to parse pandas_df_json:', e);
                }
              }
            }
          }
          
          setGeneratedSQL(sqlResult);
          setQueryResults(dataResult);
          setDetectedDomain(data.domain || null);
          
          // Add assistant response from messages
          if (data.messages) {
            const assistantMessages = data.messages.filter((msg: any) => msg.role === 'assistant');
            if (assistantMessages.length > 0) {
              const assistantTurn: ConversationTurn = {
                role: 'assistant',
                content: assistantMessages.map((msg: any) => msg.content).join('\n\n')
              };
              setConversationHistory([...currentHistory, assistantTurn]);
            }
          }
          
          return data;
        } else {
          // Handle error
          setError(data.error || "An error occurred processing your query");
          return null;
        }
      } else {
        // Original processing for the regular API endpoint
        // Additional diagnostic to help identify the issue
        if (data.pydough_code && !data.pydoughCode) {
          console.log("CRITICAL: Found data.pydough_code but not data.pydoughCode - naming inconsistency!");
          // Copy the value to ensure frontend can display it
          data.pydoughCode = data.pydough_code;
        }
        
        if (data.success) { // API call succeeded (doesn't mean execution succeeded)
          // Make sure we handle both camelCase and snake_case field names from API
          const codeToDisplay = data.pydoughCode || data.pydough_code || null;
          setGeneratedCode(codeToDisplay);
          
          // If execution happened, attempt to parse SQL and Results
          let sqlResult = null;
          let dataResult = null;
          let executionError: string | null = null; // Variable for specific execution error

          if (data.execution) { // Check if execution results exist
            // Pass dataframe JSON to notebook if available
            if (data.execution.result_data && data.execution.result_data.pandas_df_json) {
              try {
                const dfObj = JSON.parse(data.execution.result_data.pandas_df_json);
                setSelectedDataFrame(dfObj);
              } catch (e) {
                console.warn('Failed to parse pandas_df_json:', e);
              }
            }

            // More robust SQL extraction - look for it in different places
            const executionOutput = data.execution.output || '';
            
            // 1. Try to extract SQL directly from the output
            const sqlMatch = executionOutput.match(/SQL Query:([\s\S]*?)(?=Result:|$)/);
            if (sqlMatch && sqlMatch[1]) {
              sqlResult = sqlMatch[1].trim();
            }
            
            // 2. If no SQL found in output, check if it's directly provided
            if (!sqlResult && data.execution.sql) {
              sqlResult = data.execution.sql;
            }
            
            // 3. Extract results data similarly
            const dataMatch = executionOutput.match(/Result:([\s\S]*?)(?=$)/);
            if (dataMatch && dataMatch[1]) {
              const rawTableData = dataMatch[1].trim();
              const pdJsonPrefix = 'PD_JSON::';
              const pdJsonStartIndex = rawTableData.indexOf(pdJsonPrefix);

              if (pdJsonStartIndex !== -1) {
                // PD_JSON:: found, prioritize parsing this
                try {
                  const jsonDataString = rawTableData.substring(pdJsonStartIndex + pdJsonPrefix.length);
                  const parsedJson = JSON.parse(jsonDataString);

                  if (parsedJson.columns && parsedJson.data && Array.isArray(parsedJson.data)) {
                    let tableHtml = '<table class="results-table">';
                    tableHtml += '<thead><tr class="results-header">';
                    parsedJson.columns.forEach((header: string) => {
                      tableHtml += `<th class="results-header-cell">${String(header).trim()}</th>`;
                    });
                    tableHtml += '</tr></thead>';
                    tableHtml += '<tbody>';
                    parsedJson.data.forEach((row: any[]) => {
                      tableHtml += '<tr class="results-row">';
                      if (Array.isArray(row)) {
                        const MAPPED_ROW_LENGTH = parsedJson.columns.length;
                        for (let i = 0; i < MAPPED_ROW_LENGTH; i++) {
                          const cellValue = row[i];
                          tableHtml += `<td class="results-cell">${String(cellValue === null || cellValue === undefined ? '' : cellValue).trim()}</td>`;
                        }
                      } else {
                        tableHtml += `<td class="results-cell" colspan="${parsedJson.columns.length}">${String(row === null || row === undefined ? '' : row).trim()}</td>`;
                      }
                      tableHtml += '</tr>';
                    });
                    tableHtml += '</tbody></table>';
                    dataResult = tableHtml; // Successfully converted PD_JSON to HTML table
                  } else {
                    console.warn('PD_JSON:: string found, but internal structure (columns/data) is not as expected. Displaying raw PD_JSON string segment.', parsedJson);
                    dataResult = rawTableData.substring(pdJsonStartIndex); // Show the PD_JSON part as raw
                  }
                } catch (e) {
                  console.warn("Failed to parse PD_JSON:: data from execution output. Displaying raw PD_JSON string segment.", e);
                  dataResult = rawTableData.substring(pdJsonStartIndex); // Show the PD_JSON part as raw on error
                }
              } else {
                // PD_JSON:: not found in rawTableData, proceed with plain text table parsing
                if (rawTableData.includes('\n') && rawTableData.match(/\s{2,}/)) {
                  try {
                    const lines = rawTableData.split('\n').filter((line: string) => line.trim());
                    if (lines.length >= 2) {
                      let tableHtml = '<table class="results-table">';
                      const headerLine = lines[0];
                      tableHtml += '<thead><tr class="results-header">';
                      headerLine.split(/\s{2,}/).forEach((header: string) => {
                        tableHtml += `<th class="results-header-cell">${header.trim()}</th>`;
                      });
                      tableHtml += '</tr></thead>';
                      tableHtml += '<tbody>';
                      lines.slice(1).forEach((line: string) => {
                        tableHtml += '<tr class="results-row">';
                        line.split(/\s{2,}/).forEach((cell: string) => {
                          tableHtml += `<td class="results-cell">${cell.trim()}</td>`;
                        });
                        tableHtml += '</tr>';
                      });
                      tableHtml += '</tbody></table>';
                      dataResult = tableHtml;
                    } else {
                      dataResult = rawTableData;
                    }
                  } catch (e) {
                    console.warn("Failed to format plain text table data:", e);
                    dataResult = rawTableData;
                  }
                } else {
                  dataResult = rawTableData;
                }
              }
            }
            
            // 4. Direct result data if available (this might be redundant if PD_JSON was prioritized or plain text table was parsed)
            if (!dataResult && data.execution.results) {
              dataResult = JSON.stringify(data.execution.results, null, 2);
            }
            
            // Handle execution errors
            if (!data.execution.success) {
              executionError = data.execution.error || "Execution failed without a specific error message";
            }
          }
          
          // Fallback explanation if no execution result or explanation provided
          if (dataResult === null && data.explanation) {
            dataResult = data.explanation;
          }
          
          // Format the results data if it's a JSON string representing a table
          if (typeof dataResult === 'string' && dataResult.startsWith('{"type":"table"')) {
            try {
              const tableData = JSON.parse(dataResult);
              if (tableData.type === 'table' && tableData.header && tableData.rows) {
                // Format as a proper HTML table for display
                const tableHtml = `
                  <table class="results-table">
                    <thead>
                      <tr>${tableData.header.map((h: string) => `<th>${h}</th>`).join('')}</tr>
                    </thead>
                    <tbody>
                      ${tableData.rows.map((row: string[]) => 
                        `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`
                      ).join('')}
                    </tbody>
                  </table>
                `;
                // Store the HTML version for display
                dataResult = tableHtml;
              }
            } catch (e) {
              console.warn("Failed to parse or format table data:", e);
              // Keep original format if parsing fails
            }
          }
          
          setGeneratedSQL(sqlResult);
          setQueryResults(dataResult); // Store parsed/raw result string, explanation, or failure message
          setDetectedDomain(data.domain || null);
          
          // If execution failed, set the main error state
          if (executionError) {
              setError(executionError); 
          } else {
              // Optionally clear error if the whole process was successful
              // setError(null); // Decided against auto-clearing here to avoid hiding unrelated errors
          }
          
          // Add assistant response to history
          const assistantContentParts = [];
          if (codeToDisplay) {
              assistantContentParts.push(`Generated Code:\n\`\`\`python\n${codeToDisplay}\n\`\`\``);
          } else {
               assistantContentParts.push("No PyDough code was generated.");
          }

          if (sqlResult) {
              assistantContentParts.push(`SQL:\n\`\`\`sql\n${sqlResult}\n\`\`\``);
          }
          if (dataResult) { 
              assistantContentParts.push(`Result:\n${dataResult}`);
          }
          // Append execution error explicitly if it occurred
          if (executionError) {
              // Use markdown code block for potentially multi-line errors
              assistantContentParts.push(`Execution Error:\n\`\`\`\n${executionError}\n\`\`\``);
          }

          const assistantTurn: ConversationTurn = {
            role: 'assistant',
            content: assistantContentParts.join('\n\n') // Join parts with double newline
          };
          setConversationHistory(prev => [...prev, assistantTurn]);
          
          return data; // Return full response data
        } else { // API call itself failed
          const errorMsg = data.error || "Failed to process query";
          setError(errorMsg); // Set main error from top-level error
          // Add error turn to history
          const errorTurn: ConversationTurn = { role: 'assistant', content: `Error: ${errorMsg}` };
          setConversationHistory(prev => [...prev, errorTurn]);
          return data; // Still return data which includes error
        }
      }
    } catch (error: any) { // Network or other frontend error
      console.error("Error processing query:", error);
      const errorMsg = error.message || "Could not connect to backend API.";
      setError(errorMsg);
      // Add error turn to history
      const errorTurn: ConversationTurn = { role: 'assistant', content: `Error: ${errorMsg}` };
      setConversationHistory(prev => [...prev, errorTurn]);
      return { success: false, error: errorMsg };
    } finally {
      setIsLoading(false);
    }
  };
  
  // Clear conversation history
  const clearConversationHistory = () => {
    setConversationHistory([]);
    setGeneratedCode(null);
    setGeneratedSQL(null);
    setQueryResults(null);
    setDetectedDomain(null);
    setCurrentQuery(''); // Optionally clear the input box too
  };

  const contextValue: AppContextProps = {
    // Original properties
    connectionStatus,
    setConnectionStatus,
    metadata,
    setMetadata,
    currentQuery,
    setCurrentQuery,
    queryResults,
    setQueryResults,
    queryHistory,
    addQueryMessage,
    selectedDataFrame,
    setSelectedDataFrame,
    queryHistoryItems,
    addHistoryItem,
    toggleFavorite,
    addTagToHistory,
    removeTagFromHistory,
    
    // PyDough properties
    availableDatabases,
    scanDatabases,
    domainMetadata,
    loadDomainMetadata,
    detectedDomain,
    setDetectedDomain,
    generatedCode,
    setGeneratedCode,
    generatedSQL,
    setGeneratedSQL,
    connectDatabase,
    processQuery,
    isLoading,
    error,
    setError,
    
    // Conversation History properties
    conversationHistory,
    clearConversationHistory,
    
    // LangGraph support
    useLangGraph,
    setUseLangGraph,
    langGraphAvailable
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = (): AppContextProps => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
