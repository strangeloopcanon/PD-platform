import React, { createContext, useContext, useState, ReactNode } from 'react';

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

interface AppContextProps {
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
}

const AppContext = createContext<AppContextProps | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [connectionStatus, setConnectionStatus] = useState<boolean>(false);
  const [metadata, setMetadata] = useState<any[] | null>(null);
  const [currentQuery, setCurrentQuery] = useState<string>('');
  const [queryResults, setQueryResults] = useState<any | null>(null);
  const [queryHistory, setQueryHistory] = useState<QueryMessage[]>([]);
  const [selectedDataFrame, setSelectedDataFrame] = useState<any | null>(null);

  const addQueryMessage = (message: Omit<QueryMessage, 'id' | 'timestamp'>) => {
    const newMessage: QueryMessage = {
      ...message,
      id: Date.now().toString(),
      timestamp: new Date(),
    };
    setQueryHistory(prev => [...prev, newMessage]);
  };

  const value = {
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