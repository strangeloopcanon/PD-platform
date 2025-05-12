import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Database, Table, Columns, Tag, RefreshCw, FileJson, Edit, Save, X } from 'lucide-react';
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
    detectedDomain, 
    domainMetadata,
    loadDomainMetadata
  } = useAppContext();
  
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [editingField, setEditingField] = useState<{tableIndex: number, fieldIndex: number} | null>(null);
  const [fieldDescription, setFieldDescription] = useState('');
  
  // Redirect if not connected
  useEffect(() => {
    if (!connectionStatus) {
      navigate('/connect');
    }
  }, [connectionStatus, navigate]);
  
  // Load metadata when domain changes
  useEffect(() => {
    if (detectedDomain) {
      loadMetadataForDomain(detectedDomain);
    }
  }, [detectedDomain]);
  
  // Load metadata for a specific domain
  const loadMetadataForDomain = async (domain: string) => {
    setIsLoading(true);
    try {
      // If domain metadata not loaded yet, load it
      if (!domainMetadata[domain]) {
        await loadDomainMetadata(domain);
      }
      
      const metadata = domainMetadata[domain];
      
      if (metadata) {
        // Convert metadata to tables format
        // This is a simplified example - in a real app you'd parse the actual JSON schema
        const mockTables: TableInfo[] = [
          {
            name: 'Customers',
            description: 'Customer information',
            fields: [
              { name: 'customer_id', dataType: 'INTEGER', isPrimaryKey: true, isForeignKey: false, description: 'Unique identifier for each customer' },
              { name: 'first_name', dataType: 'VARCHAR', isPrimaryKey: false, isForeignKey: false, description: 'Customer first name' },
              { name: 'last_name', dataType: 'VARCHAR', isPrimaryKey: false, isForeignKey: false, description: 'Customer last name' },
              { name: 'email', dataType: 'VARCHAR', isPrimaryKey: false, isForeignKey: false, description: 'Customer email address' },
            ]
          },
          {
            name: 'Orders',
            description: 'Order information',
            fields: [
              { name: 'order_id', dataType: 'INTEGER', isPrimaryKey: true, isForeignKey: false, description: 'Unique identifier for each order' },
              { name: 'customer_id', dataType: 'INTEGER', isPrimaryKey: false, isForeignKey: true, description: 'Reference to customer who placed the order' },
              { name: 'order_date', dataType: 'DATE', isPrimaryKey: false, isForeignKey: false, description: 'Date when order was placed' },
              { name: 'total_amount', dataType: 'DECIMAL', isPrimaryKey: false, isForeignKey: false, description: 'Total amount of the order' },
            ]
          }
        ];
        
        setTables(mockTables);
        if (mockTables.length > 0) {
          setSelectedTable(mockTables[0].name);
        }
      }
    } catch (error) {
      console.error('Error loading metadata:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Start editing a field description
  const handleEditField = (tableIndex: number, fieldIndex: number, currentDescription: string) => {
    setEditingField({ tableIndex, fieldIndex });
    setFieldDescription(currentDescription);
  };
  
  // Save field description
  const handleSaveDescription = () => {
    if (!editingField) return;
    
    const { tableIndex, fieldIndex } = editingField;
    
    setTables(prevTables => {
      const newTables = [...prevTables];
      newTables[tableIndex].fields[fieldIndex].description = fieldDescription;
      return newTables;
    });
    
    setEditingField(null);
  };
  
  // Cancel editing
  const handleCancelEdit = () => {
    setEditingField(null);
  };
  
  // Get the selected table info
  const getSelectedTableInfo = () => {
    if (!selectedTable) return null;
    return tables.find(table => table.name === selectedTable);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-semibold text-gray-900">Schema Metadata</h1>
      <p className="mt-2 text-sm text-gray-700">
        View and customize database schema metadata
      </p>
      
      <div className="mt-6 flex flex-col md:flex-row gap-6">
        {/* Left sidebar for tables */}
        <div className="w-full md:w-64 flex-shrink-0">
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <h2 className="text-sm font-medium text-gray-900">Tables</h2>
              <button 
                type="button"
                onClick={() => detectedDomain && loadMetadataForDomain(detectedDomain)}
                className="inline-flex items-center p-1 border border-transparent rounded-full shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
            
            <div className="overflow-y-auto max-h-96">
              <ul className="divide-y divide-gray-200">
                {tables.map((table, index) => (
                  <li key={index}>
                    <button
                      onClick={() => setSelectedTable(table.name)}
                      className={`w-full text-left px-4 py-3 flex items-center ${
                        selectedTable === table.name ? 'bg-blue-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <Table className="h-5 w-5 text-gray-400 mr-2" />
                      <span className="text-sm font-medium text-gray-900">{table.name}</span>
                    </button>
                  </li>
                ))}
                
                {tables.length === 0 && !isLoading && (
                  <li className="px-4 py-3 text-sm text-gray-500 text-center">
                    No tables found
                  </li>
                )}
                
                {isLoading && (
                  <li className="px-4 py-3 text-sm text-gray-500 text-center">
                    Loading metadata...
                  </li>
                )}
              </ul>
            </div>
          </div>
          
          {detectedDomain && (
            <div className="mt-4 bg-white shadow rounded-lg p-4">
              <div className="flex items-center">
                <FileJson className="h-5 w-5 text-gray-400 mr-2" />
                <h3 className="text-sm font-medium text-gray-900">Current Domain:</h3>
              </div>
              <div className="mt-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  <Database className="h-3 w-3 mr-1" />
                  {detectedDomain}
                </span>
              </div>
              
              <div className="mt-3 text-xs text-gray-500">
                {availableDatabases.find(db => db.name === detectedDomain)?.metadataFile}
              </div>
            </div>
          )}
        </div>
        
        {/* Right content area for table details */}
        <div className="flex-1">
          <div className="bg-white shadow rounded-lg overflow-hidden">
            {getSelectedTableInfo() ? (
              <>
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                  <h2 className="text-lg font-medium text-gray-900">
                    {getSelectedTableInfo()?.name}
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    {getSelectedTableInfo()?.description || 'No description available'}
                  </p>
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
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {getSelectedTableInfo()?.fields.map((field, fieldIndex) => {
                        const tableIndex = tables.findIndex(t => t.name === selectedTable);
                        const isEditing = editingField && 
                                           editingField.tableIndex === tableIndex && 
                                           editingField.fieldIndex === fieldIndex;
                        
                        return (
                          <tr key={fieldIndex}>
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
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={fieldDescription}
                                  onChange={(e) => setFieldDescription(e.target.value)}
                                  className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                                />
                              ) : (
                                field.description || <span className="text-gray-400 italic">No description</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              {isEditing ? (
                                <div className="flex justify-end space-x-2">
                                  <button
                                    onClick={handleSaveDescription}
                                    className="text-primary-600 hover:text-primary-900"
                                  >
                                    <Save className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={handleCancelEdit}
                                    className="text-gray-600 hover:text-gray-900"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleEditField(tableIndex, fieldIndex, field.description)}
                                  className="text-primary-600 hover:text-primary-900"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="p-6 text-center">
                <Columns className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No table selected</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Select a table from the list to view its metadata
                </p>
              </div>
            )}
          </div>
          
          {/* Table relationships visualization placeholder */}
          <div className="mt-6 bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Table Relationships</h3>
            
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 h-64 flex items-center justify-center">
              <div className="text-center">
                <Tag className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">
                  A visual representation of table relationships would be shown here
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  This would be implemented using a graph visualization library like D3.js
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MetadataPage;
