import React, { useState, useEffect } from 'react';
import { Database, Server, CheckCircle, XCircle, RefreshCw, Zap } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const ConnectionPage: React.FC = () => {
  const { 
    availableDatabases, 
    scanDatabases, 
    connectDatabase, 
    connectionStatus,
    isLoading,
    error,
    setError
  } = useAppContext();
  
  const [isConnecting, setIsConnecting] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [autoConnectComplete, setAutoConnectComplete] = useState<boolean>(false);
  
  // When global error changes, update our local error
  useEffect(() => {
    if (error) {
      setConnectionError(error);
    }
  }, [error]);
  
  // Auto-connect to all databases when they are loaded
  useEffect(() => {
    const connectAllDatabases = async () => {
      if (!autoConnectComplete && availableDatabases.length > 0 && !connectionStatus) {
        setAutoConnectComplete(true); // Prevent multiple connection attempts
        
        // Find the first database that exists and connect to it
        const databasesToConnect = availableDatabases.filter(db => !db.connected);
        
        if (databasesToConnect.length > 0) {
          setIsConnecting('all');
          try {
            // Connect to the first database that exists
            for (const db of databasesToConnect) {
              if (db.exists) {
                await connectDatabase(db.name);
                break; // Connect to only one database initially
              }
            }
          } catch (error) {
            console.error('Auto-connection error:', error);
          } finally {
            setIsConnecting(null);
          }
        }
      }
    };
    
    connectAllDatabases();
  }, [availableDatabases, connectionStatus, autoConnectComplete, connectDatabase]);
  
  // Rescan databases
  const handleRescan = async () => {
    setConnectionError(null);
    setError(null);
    setAutoConnectComplete(false); // Reset auto-connect flag
    await scanDatabases();
  };
  
  // Connect to a database
  const handleConnect = async (domainName: string) => {
    setIsConnecting(domainName);
    setConnectionError(null);
    setError(null);
    
    try {
      const success = await connectDatabase(domainName);
      
      if (!success) {
        setConnectionError(`Failed to connect to ${domainName}`);
      }
    } catch (error) {
      setConnectionError(`Error connecting to ${domainName}: ${error}`);
      console.error('Connection error:', error);
    } finally {
      setIsConnecting(null);
    }
  };

  // Connect to all databases
  const handleConnectAll = async () => {
    setIsConnecting('all');
    setConnectionError(null);
    setError(null);
    
    try {
      // Process databases sequentially to ensure reliable connections
      console.log("Starting to connect all databases...");
      
      for (const db of availableDatabases) {
        if (!db.connected && db.exists) {
          console.log(`Connecting to ${db.name}...`);
          await connectDatabase(db.name);
          // Add a small delay between connections
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
      
      console.log("All database connections complete");
    } catch (error) {
      setConnectionError(`Error connecting to databases: ${error}`);
      console.error('Connection error:', error);
    } finally {
      setIsConnecting(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {!connectionStatus && availableDatabases.length > 0 && (
        <div className="mb-8 bg-blue-50 border-2 border-blue-300 rounded-lg p-6 shadow-lg">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="mb-4 md:mb-0">
              <h2 className="text-lg font-semibold text-blue-800">Quick Start</h2>
              <p className="text-blue-600">
                Connect to all available databases with a single click to start querying.
              </p>
            </div>
            <button
              onClick={handleConnectAll}
              className="animate-pulse w-full md:w-auto inline-flex justify-center items-center px-6 py-3 border border-transparent shadow-lg text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              disabled={isLoading || isConnecting === 'all'}
            >
              <Zap className="h-6 w-6 mr-2" />
              {isConnecting === 'all' ? 'Connecting...' : 'Connect All Databases'}
            </button>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Database Connections</h1>
        <div className="flex space-x-2">
          {!connectionStatus && availableDatabases.some(db => !db.connected && db.exists) && (
            <button
              onClick={handleConnectAll}
              className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              disabled={isLoading || isConnecting === 'all'}
            >
              {isConnecting === 'all' ? (
                <>
                  <RefreshCw className="animate-spin h-4 w-4 mr-2" />
                  Connecting...
                </>
              ) : (
                <>
                  <Database className="h-4 w-4 mr-2" />
                  Connect All
                </>
              )}
            </button>
          )}
          <button 
            onClick={handleRescan}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Scanning...' : 'Rescan'}
          </button>
        </div>
      </div>
      
      {connectionError && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <XCircle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{connectionError}</p>
            </div>
          </div>
        </div>
      )}
      
      {connectionStatus && (
        <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <CheckCircle className="h-5 w-5 text-green-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-700">
                Connected successfully! You can now explore metadata, run queries, or analyze data.
              </p>
            </div>
          </div>
        </div>
      )}
      
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {isLoading && availableDatabases.length === 0 ? (
            <li className="px-4 py-5 sm:px-6 text-center">
              <RefreshCw className="h-8 w-8 text-gray-400 mx-auto animate-spin" />
              <p className="mt-2 text-gray-500">Scanning for available databases...</p>
            </li>
          ) : availableDatabases.length > 0 ? (
            availableDatabases.map((database) => (
              <li key={database.name}>
                <div className="px-4 py-5 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 bg-primary-100 rounded-md p-2">
                        <Database className="h-6 w-6 text-primary-600" />
                      </div>
                      <div className="ml-4">
                        <h3 className="text-lg font-medium text-gray-900">{database.name}</h3>
                        <p className="text-sm text-gray-500">
                          <span className="font-medium">File:</span> {database.databaseFile}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {database.keywords.slice(0, 5).map((keyword, idx) => (
                            <span 
                              key={idx} 
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                            >
                              {keyword}
                            </span>
                          ))}
                          {database.keywords.length > 5 && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              +{database.keywords.length - 5} more
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      {database.connected ? (
                        <div className="flex items-center text-green-600 mr-4">
                          <CheckCircle className="h-5 w-5 mr-1" />
                          <span className="text-sm font-medium">Connected</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                          onClick={() => handleConnect(database.name)}
                          disabled={isConnecting === database.name || !database.exists}
                        >
                          {isConnecting === database.name ? (
                            <>
                              <RefreshCw className="animate-spin h-4 w-4 mr-2" />
                              Connecting...
                            </>
                          ) : !database.exists ? (
                            <>
                              <XCircle className="h-4 w-4 mr-2" />
                              Missing File
                            </>
                          ) : (
                            <>
                              <Server className="h-4 w-4 mr-2" />
                              Connect
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))
          ) : (
            <li className="px-4 py-5 sm:px-6 text-center">
              <p className="text-gray-500">No databases found. Try rescanning or check the data folder.</p>
            </li>
          )}
        </ul>
      </div>
      
      <div className="mt-8 bg-white shadow sm:rounded-md p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Connection Information</h2>
        
        <div className="bg-gray-50 p-4 rounded-md">
          <p className="text-sm text-gray-600">
            This page allows you to connect to databases discovered in the data directory.
            Each database corresponds to a domain (Broker, Dealership, etc.) in the PyDough system.
          </p>
          
          {connectionError && connectionError.includes("backend API") && (
            <div className="mt-4 p-4 border border-yellow-300 bg-yellow-50 rounded-md">
              <h3 className="text-sm font-medium text-yellow-800">Running in Demo Mode</h3>
              <p className="mt-1 text-sm text-yellow-700">
                The backend API is running in mock/demo mode. Some functionality may be limited,
                but you can still explore the interface.
              </p>
              <button
                onClick={() => {
                  // Force a mock connection in demo mode
                  setConnectionError(null);
                  setError(null);
                  handleConnectAll();
                }}
                className="mt-2 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
              >
                Connect Demo Database
              </button>
            </div>
          )}

          <div className="mt-4">
            <h3 className="text-sm font-medium text-gray-900">Currently supported domains:</h3>
            <ul className="mt-2 text-sm text-gray-600 space-y-1 list-disc list-inside">
              <li>Broker - Stock brokerage data</li>
              <li>Dealership - Automotive dealership management</li>
              <li>DermTreatment - Dermatology clinic information</li>
              <li>Ewallet - Digital wallet transactions</li>
              <li>TPCH - Standard TPC-H benchmark database</li>
            </ul>
          </div>
          
          <p className="mt-4 text-sm text-gray-600">
            Once connected, you can explore metadata, run natural language queries,
            and analyze data through the notebook interface.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ConnectionPage;
