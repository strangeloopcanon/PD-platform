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

// New interface for database metadata
interface DomainMetadata {
  tables: any[];
  relationships: any[];
  [key: string]: any;
}

// API endpoints
const API_BASE_URL = "http://localhost:5001/api";

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
  processQuery: (query: string, domain?: string | null) => Promise<any>;
  executeCode: (code: string) => Promise<any>;
  isLoading: boolean;
  error: string | null;
  setError: (error: string | null) => void;
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
      console.log("Scanning for available databases...");
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
        
        console.log(`Loaded metadata for domain: ${domain}`, data.metadata);
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
      console.log(`Attempting to connect to ${domain}...`);
      const response = await fetch(`${API_BASE_URL}/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ domain })
      });
      
      const data = await response.json();
      console.log(`Connection response for ${domain}:`, data);
      
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
  
  // Process a natural language query
  const processQuery = async (query: string, domain: string | null = null): Promise<any> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query,
          domain: domain || undefined
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Update state with results
        setGeneratedCode(data.pydoughCode);
        setGeneratedSQL(data.sql);
        
        // If domain was auto-detected, update it
        if (!domain && data.domain) {
          setDetectedDomain(data.domain);
        }
        
        // Add to query history
        addQueryMessage({
          role: 'user',
          content: query,
          code: {
            pydough: data.pydoughCode,
            sql: data.sql
          }
        });
        
        // Add to history items
        addHistoryItem({
          query: query,
          result: null, // Will be filled after execution
          favorite: false,
          tags: [],
          domain: data.domain,
          pydoughCode: data.pydoughCode,
          sql: data.sql
        });
        
        return data;
      } else {
        setError(data.error || 'Failed to process query');
        return { error: data.error };
      }
    } catch (error) {
      console.error(`Error processing query:`, error);
      setError('Error processing query');
      return { error: String(error) };
    } finally {
      setIsLoading(false);
    }
  };
  
  // Execute PyDough code
  const executeCode = async (code: string): Promise<any> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          code,
          domain: detectedDomain || undefined
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Update state with results
        setQueryResults(data.results);
        
        // Update SQL if it was provided
        if (data.sql) {
          setGeneratedSQL(data.sql);
        }
        
        // Update the most recent history item with results
        if (queryHistoryItems.length > 0) {
          const mostRecentItem = queryHistoryItems[0];
          const updatedItems = [
            { 
              ...mostRecentItem, 
              result: data.results,
              sql: data.sql || mostRecentItem.sql // Update SQL if available
            },
            ...queryHistoryItems.slice(1)
          ];
          
          setQueryHistoryItems(updatedItems);
          
          // Save to localStorage
          try {
            localStorage.setItem('demoHistoryItems', JSON.stringify(updatedItems));
          } catch (error) {
            console.error('Error saving history items:', error);
          }
        }
        
        return data;
      } else {
        // Display execution error if present
        if (data.executionError) {
          setError(`Execution failed: ${data.executionError}`);
        } else {
          setError(data.error || 'Failed to execute code');
        }
        return { error: data.error || data.executionError };
      }
    } catch (error) {
      console.error(`Error executing code:`, error);
      setError('Error executing code');
      return { error: String(error) };
    } finally {
      setIsLoading(false);
    }
  };
  
  // Auto-scan databases on initial load
  useEffect(() => {
    scanDatabases();
  }, []);

  const value = {
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
    
    // New properties
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
    executeCode,
    isLoading,
    error,
    setError
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = (): AppContextProps => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
