import React, { useState, useEffect, useCallback } from 'react';
import { Database, Server, CheckCircle, XCircle, RefreshCw, Zap, FileText, FileJson, Settings2 } from 'lucide-react';
import { useAppContext, Domain as AppContextDomain } from '../context/AppContext';

// --- New Interface for Schema Status ---
interface IDatabaseSchemaStatus {
  db_filename: string;
  display_name: string;
  base_name: string;
  has_json: boolean;
  has_md: boolean;
  is_generating_metadata?: boolean; // For UI loading state
}

// --- Helper type for merged database info ---
interface IDatabaseDisplayInfo extends AppContextDomain { // Use AppContextDomain
  schema_status?: IDatabaseSchemaStatus;
}

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

  // --- New State for Schema Status ---
  const [dbSchemaStatus, setDbSchemaStatus] = useState<IDatabaseSchemaStatus[]>([]);
  const [isFetchingSchemaStatus, setIsFetchingSchemaStatus] = useState<boolean>(false);
  const [schemaError, setSchemaError] = useState<string | null>(null);
  const [generating, setGenerating] = useState<{ [key: string]: boolean }>({});

  // --- Function to fetch schema status ---
  const fetchSchemaStatus = useCallback(async (force = false) => {
    setIsFetchingSchemaStatus(true);
    setSchemaError(null);
    try {
      // Use cache: 'no-cache' to ensure we get fresh data
      const fetchOptions: RequestInit = force ? 
        { cache: 'no-cache' as RequestCache, headers: { 'Cache-Control': 'no-cache' } } : 
        {};
        
      console.log(`Fetching schema status (force=${force})...`);
      // Use absolute URL to ensure we hit the backend, not the frontend
      const response = await fetch('http://localhost:5001/api/databases/status', fetchOptions);
      
      if (!response.ok) {
        let errorText = `HTTP error! status: ${response.status}`;
        try {
          const rawText = await response.text();
          errorText += ` - ${rawText}`;
        } catch {}
        throw new Error(errorText);
      }
      const data = await response.json();
      console.log('API /api/databases/status response:', data);
      if (Array.isArray(data)) {
        setDbSchemaStatus(data);
      } else if (data && typeof data === 'object' && data.error) {
        setSchemaError(data.error);
        setDbSchemaStatus([]);
      } else {
        setSchemaError('Unexpected response from server.');
        setDbSchemaStatus([]);
      }
    } catch (err: any) {
      console.error('Error fetching schema status:', err);
      setSchemaError(err.message || 'Failed to fetch schema status.');
      setDbSchemaStatus([]);
    } finally {
      setIsFetchingSchemaStatus(false);
    }
  }, []);

  // Fetch schema status on mount and when availableDatabases changes (to match them up)
  useEffect(() => {
    fetchSchemaStatus();
  }, [fetchSchemaStatus]); // availableDatabases removed as it might cause too many refetches
                           // We will rely on manual refresh or rescan to update the list if new .db files are added

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
        
        const databasesToConnect = availableDatabases.filter(db => !db.connected && db.exists);
        
        if (databasesToConnect.length > 0) {
          setIsConnecting('all');
          try {
            for (const db of databasesToConnect) {
              if (db.exists) {
                await connectDatabase(db.name);
                break; 
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
  
  // Rescan databases (also refetches schema status)
  const handleRescan = async () => {
    console.log("Rescanning databases and metadata status...");
    setConnectionError(null);
    setError(null);
    setSchemaError(null);
    setAutoConnectComplete(false); 
    
    try {
      // First scan databases to update availableDatabases
      await scanDatabases();
      console.log("Database scan complete, waiting before fetching schema status...");
      
      // Add a small delay to ensure backend is ready
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Then fetch updated schema status with force=true to bypass cache
      console.log("Fetching schema status after database scan...");
      await fetchSchemaStatus(true);
      console.log("Schema status fetch complete.");
    } catch (err) {
      console.error("Error during rescan:", err);
    }
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
    } catch (error: any) {
      setConnectionError(`Error connecting to ${domainName}: ${error.message || String(error)}`);
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
      console.log("Starting to connect all databases...");
      
      for (const db of availableDatabases) {
        if (!db.connected && db.exists) {
          console.log(`Connecting to ${db.name}...`);
          await connectDatabase(db.name);
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
      
      console.log("All database connections complete");
    } catch (error: any) {
      setConnectionError(`Error connecting to databases: ${error.message || String(error)}`);
      console.error('Connection error:', error);
    } finally {
      setIsConnecting(null);
    }
  };

  // --- Handler to Generate Metadata ---
  const handleGenerateMetadata = async (db_filename: string) => {
    console.log(`Generating metadata for: ${db_filename}`);
    setGenerating((prev) => ({ ...prev, [db_filename]: true }));
    try {
      // Make sure we have a valid filename
      if (!db_filename || !db_filename.endsWith('.db')) {
        throw new Error(`Invalid database filename: ${db_filename}`);
      }
      
      const requestData = { db_filename };
      console.log('Sending metadata generation request:', requestData);
      
      const response = await fetch('http://localhost:5001/api/databases/generate-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
        // Force bypass cache
        cache: 'no-cache' as RequestCache,
      });
      
      const responseText = await response.text();
      console.log(`API Response [${response.status}]:`, responseText);
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} - ${responseText}`);
      }
      
      // Try to parse as JSON
      let responseData;
      try {
        responseData = JSON.parse(responseText);
        console.log('Parsed API response:', responseData);
      } catch (parseErr) {
        console.error('Failed to parse API response as JSON:', parseErr);
      }
      
      // Wait a moment to ensure files are written
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Directly fetch with force=true to bypass cache
      await fetchSchemaStatus(true);
    } catch (err: any) {
      console.error('Metadata generation error:', err);
      alert(`Failed to generate metadata: ${err.message}`);
    } finally {
      setGenerating((prev) => ({ ...prev, [db_filename]: false }));
    }
  };

  // --- Merge availableDatabases with dbSchemaStatus robustly ---
  const mergedDatabases: IDatabaseDisplayInfo[] = availableDatabases.map(db => {
    const dbFileName = db.databaseFile.split('/').pop()?.toLowerCase().trim() || '';
    // Try to match on db_filename, fallback to base_name if needed
    let schema = dbSchemaStatus.find(
      s => s.db_filename.toLowerCase().trim() === dbFileName
    );
    if (!schema) {
      // Try matching on base_name (without .db)
      const dbBaseName = dbFileName.replace(/\.db$/, '');
      schema = dbSchemaStatus.find(
        s => s.base_name.toLowerCase().trim() === dbBaseName
      );
    }
    if (!schema) {
      console.warn('No schema status found for', db.name, 'looking for', dbFileName, 'or', dbFileName.replace(/\.db$/, ''), 'in', dbSchemaStatus);
    } else {
      console.log(`Database ${db.name} schema status:`, schema);
    }
    return {
      ...db,
      schema_status: schema
    };
  });

  // Helper to get schema status for a DB
  const getSchemaStatus = (dbFile: string) => dbSchemaStatus.find((s) => s.db_filename === dbFile);

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
        <h1 className="text-2xl font-semibold text-gray-900">Database Connections & Metadata</h1>
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
            disabled={isLoading || isFetchingSchemaStatus} // Disable during schema status fetch too
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${(isLoading || isFetchingSchemaStatus) ? 'animate-spin' : ''}`} />
            {(isLoading || isFetchingSchemaStatus) ? 'Scanning...' : 'Rescan All'}
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

      {schemaError && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <XCircle className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">{schemaError}</p>
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
          {(isLoading || isFetchingSchemaStatus) && mergedDatabases.length === 0 ? (
            <li className="px-4 py-5 sm:px-6 text-center">
              <RefreshCw className="h-8 w-8 text-gray-400 mx-auto animate-spin" />
              <p className="mt-2 text-gray-500">Scanning for databases and metadata status...</p>
            </li>
          ) : mergedDatabases.length > 0 ? (
            mergedDatabases.map((database) => {
              const schemaInfo = database.schema_status;
              // Add debug logs to see what's happening with the metadata status
              console.log(`[DEBUG] ${database.name} metadata status:`, 
                `has_schema:`, !!schemaInfo, 
                `has_json:`, schemaInfo?.has_json, 
                `has_md:`, schemaInfo?.has_md);
              
              const metadataReady = !!(schemaInfo && schemaInfo.has_json && schemaInfo.has_md);
              console.log(`[DEBUG] ${database.name} metadataReady:`, metadataReady);
              
              return (
                <li key={database.name}>
                  <div className="px-4 py-5 sm:px-6">
                    <div className="flex items-center justify-between">
                      {/* Left side: DB Info and Keywords */}
                      <div className="flex items-center">
                        <div className={`flex-shrink-0 rounded-md p-2 ${database.connected ? 'bg-green-100' : 'bg-primary-100'}`}>
                          <Database className={`h-6 w-6 ${database.connected ? 'text-green-600' : 'text-primary-600'}`} />
                        </div>
                        <div className="ml-4">
                          <h3 className="text-lg font-medium text-gray-900">{database.name}</h3>
                          <p className="text-sm text-gray-500">
                            <span className="font-medium">File:</span> {database.databaseFile}
                          </p>
                          {/* Keywords - unchanged */}
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
                      
                      {/* Right side: Connection, Schema Status & Actions */}
                      <div className="flex flex-col items-end space-y-2">
                        {/* Connection Status and Button */}
                        {database.connected ? (
                          <div className="flex items-center text-green-600">
                            <CheckCircle className="h-5 w-5 mr-1" />
                            <span className="text-sm font-medium">Connected</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                            onClick={() => handleConnect(database.name)}
                            disabled={isConnecting === database.name || !database.exists}
                          >
                            {isConnecting === database.name ? (
                              <RefreshCw className="animate-spin h-4 w-4 mr-1.5" />
                            ) : (
                              <Server className="h-4 w-4 mr-1.5" />
                            )}
                            {isConnecting === database.name ? 'Connecting...' : 'Connect'}
                          </button>
                        )}

                        {/* Schema Status and Generate Button */}
                        {(() => {
                          // Debug what values are being used to determine whether to show the button
                          const hasSchema = !!schemaInfo;
                          // Convert undefined, null or false to false explicitly 
                          const hasJson = schemaInfo?.has_json === true;
                          const hasMd = schemaInfo?.has_md === true;
                          const ready = hasSchema && hasJson && hasMd;
                          
                          console.log(`[RENDER] ${database.name} metadata check:`, 
                            `hasSchema=${hasSchema}`, 
                            `hasJson=${hasJson}`, 
                            `hasMd=${hasMd}`, 
                            `ready=${ready}`,
                            `schema=`, schemaInfo);
                          
                          if (ready) {
                            return (
                              <div className="flex items-center text-sm text-green-600 font-medium">
                                <CheckCircle className="h-5 w-5 mr-1" /> Metadata Ready
                              </div>
                            );
                          } else {
                            // If metadata is not ready, show Generate Metadata button
                            const db_filename = schemaInfo?.db_filename || database.databaseFile.split('/').pop() || '';
                            console.log(`[RENDER] Showing "Generate Metadata" button for ${database.name}, using filename: ${db_filename}`);
                            return (
                              <button
                                onClick={() => handleGenerateMetadata(db_filename)}
                                className="flex items-center px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                                disabled={generating[db_filename]}
                                aria-label="Generate metadata for this database"
                              >
                                {generating[db_filename] ? (
                                  <>
                                    <RefreshCw className="animate-spin h-4 w-4 mr-1.5" />
                                    Generating...
                                  </>
                                ) : (
                                  <>
                                    <Settings2 className="h-4 w-4 mr-1.5" />
                                    Generate Metadata
                                  </>
                                )}
                              </button>
                            );
                          }
                        })()}
                      </div>
                    </div>
                  </div>
                </li>
              )
            })
          ) : (
            <li className="px-4 py-5 sm:px-6 text-center">
              <Server className="h-8 w-8 text-gray-400 mx-auto" />
              <p className="mt-2 text-gray-500">No databases found. Try rescanning.</p>
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
