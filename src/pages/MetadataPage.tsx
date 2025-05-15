import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Database, Table, Columns, RefreshCw, FileJson } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

interface TableField {
  name: string;
  dataType: string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  description: string;
}

interface TableInfo {
  name: string;
  fields: TableField[];
  description?: string;
}

const MetadataPage: React.FC = () => {
  const navigate = useNavigate();
  const { 
    connectionStatus, 
    availableDatabases, 
    domainMetadata,
    loadDomainMetadata,
    isLoading: isContextLoading // Use context's loading state
  } = useAppContext();
  
  const [pageIsLoading, setPageIsLoading] = useState(false);

  // Redirect if not connected (overall connection status)
  useEffect(() => {
    if (!connectionStatus && availableDatabases.every(db => !db.connected)) {
      // If no global connection and no individual DBs are connected
      // navigate('/connect'); // This might be too aggressive if some dbs can be connected individually.
      // For now, let's rely on the user connecting to at least one DB.
    }
  }, [connectionStatus, availableDatabases, navigate]);
  
  // Load metadata for connected domains if not already loaded
  useEffect(() => {
    const loadAllMissingMetadata = async () => {
      setPageIsLoading(true);
      const metadataPromises: Promise<void>[] = [];
      availableDatabases.forEach(db => {
        if (db.connected && !domainMetadata[db.name]) {
          metadataPromises.push(loadDomainMetadata(db.name));
        }
      });
      if (metadataPromises.length > 0) {
        try {
          await Promise.all(metadataPromises);
        } catch (error) {
          console.error("Error loading metadata for some domains:", error);
          // Error handling can be improved here, perhaps show a notification
        }
      }
      setPageIsLoading(false);
    };
    loadAllMissingMetadata();
  }, [availableDatabases, domainMetadata, loadDomainMetadata]);
  
  const handleRefreshAllMetadata = async () => {
    setPageIsLoading(true);
    const refreshPromises: Promise<void>[] = [];
    availableDatabases.forEach(db => {
      if (db.connected) {
        refreshPromises.push(loadDomainMetadata(db.name));
      }
    });
    if (refreshPromises.length > 0) {
      try {
        await Promise.all(refreshPromises);
      } catch (error) {
        console.error("Error refreshing metadata:", error);
      }
    }
    setPageIsLoading(false);
  };

  const connectedDbsWithMetadata = availableDatabases.filter(
    db => db.connected && domainMetadata[db.name]
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Schema Metadata</h1>
          <p className="mt-2 text-sm text-gray-700">
            Viewing schema metadata for all connected databases.
          </p>
        </div>
        <button 
          type="button"
          onClick={handleRefreshAllMetadata}
          className="inline-flex items-center p-2 border border-transparent rounded-full shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          disabled={pageIsLoading || isContextLoading}
        >
          <RefreshCw className={`h-5 w-5 ${ (pageIsLoading || isContextLoading) ? 'animate-spin' : ''}`} />
          <span className="ml-2">Refresh All</span>
        </button>
      </div>
      
      {(pageIsLoading || isContextLoading) && (
        <div className="text-center py-4">
          <p className="text-sm text-gray-500">Loading metadata...</p>
          {/* You could add a spinner here */}
        </div>
      )}

      {(!pageIsLoading && !isContextLoading && connectedDbsWithMetadata.length === 0) && (
        <div className="text-center py-10 bg-white shadow rounded-lg">
          <Database className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No Connected Databases with Metadata</h3>
          <p className="mt-1 text-sm text-gray-500">
            Please connect to a database to view its schema metadata.
          </p>
          <div className="mt-6">
            <button
              type="button"
              onClick={() => navigate('/connect')}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Go to Connections
            </button>
          </div>
        </div>
      )}

      {connectedDbsWithMetadata.map(db => {
        const currentDomainMeta = domainMetadata[db.name];
        console.log(`[MetadataPage] Domain: ${db.name}, Metadata received:`, currentDomainMeta); // Diagnostic log

        let tablesToShow: TableInfo[] = [];
        if (currentDomainMeta) {
          if (Array.isArray(currentDomainMeta.tables)) {
            // Structure 1: metadata object has an explicit 'tables' array
            tablesToShow = currentDomainMeta.tables.map((table: any) => ({
              name: table.name || 'Unknown Table',
              description: table.description || '',
              fields: Array.isArray(table.fields) ? table.fields.map((field: any) => ({
                name: field.column_name || field.name || 'Unknown Field',
                dataType: field.data_type || field.dataType || 'unknown',
                isPrimaryKey: field.isPrimaryKey || false,
                isForeignKey: field.isForeignKey || false,
                description: field.description || 'No description'
              })) : []
            }));
          } else if (typeof currentDomainMeta === 'object' && !Array.isArray(currentDomainMeta)){
            // Structure 2: Keys are table names OR it's a single domain key containing tables
            let potentialTablesObject = currentDomainMeta;
            const topLevelKeys = Object.keys(currentDomainMeta);

            // Check if it's a single top-level key that is the domain name itself (e.g., "Broker": { "Customers": ... })
            // and the actual tables are inside that object.
            if (topLevelKeys.length === 1 && 
                typeof currentDomainMeta[topLevelKeys[0]] === 'object' && 
                currentDomainMeta[topLevelKeys[0]] !== null && 
                !Array.isArray(currentDomainMeta[topLevelKeys[0]])) {
              
              // Check if the children of this single key look like tables (have properties)
              const nestedKeys = Object.keys(currentDomainMeta[topLevelKeys[0]]);
              if (nestedKeys.length > 0) {
                const firstNestedValue = currentDomainMeta[topLevelKeys[0]][nestedKeys[0]];
                if (typeof firstNestedValue === 'object' && firstNestedValue !== null && firstNestedValue.properties) {
                  potentialTablesObject = currentDomainMeta[topLevelKeys[0]];
                }
              }
            }

            tablesToShow = Object.entries(potentialTablesObject)
              .filter(([key, value]) => 
                typeof value === 'object' && value !== null && 
                value.properties && typeof value.properties === 'object' && key !== 'relationships' // also exclude potential 'relationships' array if it's at this level
              )
              .map(([tableName, tableData]: [string, any]) => {
                const fields: TableField[] = Object.entries(tableData.properties)
                  .map(([fieldName, fieldDetails]: [string, any]) => ({
                    name: fieldDetails.column_name || fieldName, // Prefer column_name if available
                    dataType: fieldDetails.data_type || fieldDetails.type || 'unknown', // Prefer data_type
                    isPrimaryKey: fieldDetails.isPrimaryKey || false, 
                    isForeignKey: fieldDetails.isForeignKey || false,
                    description: fieldDetails.description || (typeof fieldDetails.type === 'string' && fieldDetails.type.startsWith('table_col') ? '' : fieldDetails.type) || 'No description' 
                  }));
                
                return {
                  name: tableName,
                  description: tableData.description || tableData.table_type || tableData.type || `Details for ${tableName}`,
                  fields: fields
                };
              });
          }
        }

        return (
          <div key={db.name} className="mb-12">
            <div className="p-4 border-b border-gray-200 bg-gray-100 rounded-t-lg">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                <FileJson className="h-6 w-6 text-primary-600 mr-2" /> 
                Domain: {db.name}
              </h2>
              {db.metadataFile && <p className="text-xs text-gray-500 mt-1">Metadata source: {db.metadataFile}</p>}
            </div>

            {tablesToShow.length === 0 && (
              <div className="bg-white shadow rounded-b-lg p-6 text-center">
                <Columns className="mx-auto h-10 w-10 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No tables found for {db.name}</h3>
                <p className="mt-1 text-sm text-gray-500">
                  The metadata for this domain might be empty or incorrectly formatted.
                </p>
              </div>
            )}

            {tablesToShow.map((table, tableIndex) => (
              <div key={table.name || tableIndex} className="mt-4 bg-white shadow rounded-lg overflow-hidden">
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                  <h3 className="text-lg font-medium text-gray-900">
                    <Table className="h-5 w-5 text-gray-500 mr-2 inline"/>
                    {table.name}
                  </h3>
                  {table.description && (
                    <p className="mt-1 text-sm text-gray-500">
                      {table.description}
                    </p>
                  )}
                </div>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Field Name
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Data Type
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Attributes
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Description
                        </th>
                        {/* Actions column removed for now
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                        */}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {table.fields.map((field, fieldIndex) => (
                        <tr key={field.name || fieldIndex}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {field.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {field.dataType}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex flex-wrap gap-1">
                              {field.isPrimaryKey && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                  Primary Key
                                </span>
                              )}
                              {field.isForeignKey && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                  Foreign Key
                                </span>
                              )}
                              {(!field.isPrimaryKey && !field.isForeignKey) && (
                                <span className="text-xs text-gray-400 italic">N/A</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {field.description || <span className="text-gray-400 italic">No description</span>}
                          </td>
                          {/* Edit/Save buttons removed for now
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            // Editing UI would go here if re-enabled
                          </td>
                          */}
                        </tr>
                      ))}
                      {table.fields.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-6 py-4 text-sm text-gray-500 text-center italic">
                            This table has no fields defined in the metadata.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}

            {/* Raw JSON display section */}
            <div className="mt-6">
              <h4 className="text-md font-semibold text-gray-700 mb-2">Raw Metadata (JSON)</h4>
              <pre className="bg-gray-800 text-white p-4 rounded-md overflow-x-auto text-xs">
                <code>
                  {JSON.stringify(currentDomainMeta, null, 2) || 'No raw metadata available or metadata is null.'}
                </code>
              </pre>
            </div>

          </div>
        )
      })}
      
      {/* Old placeholder for table relationships - can be per-domain if needed later
      <div className="mt-6 bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Table Relationships</h3>
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 h-64 flex items-center justify-center">
          <div className="text-center">
            <Tag className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-sm text-gray-500">
              A visual representation of table relationships would be shown here (per domain)
            </p>
          </div>
        </div>
      </div>
      */}
    </div>
  );
};

export default MetadataPage;
