import React, { useState, useEffect } from 'react';
import { File, Edit2, Database, Table2, Eye, Download, Save, Plus, Share2, X, Upload } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import toast, { Toaster } from 'react-hot-toast';
import SchemaRecommendations from '../components/SchemaRecommendations';
import ImportSemanticLayer from '../components/ImportSemanticLayer';

interface TableMetadata {
  id: string;
  name: string;
  description: string;
  columns: ColumnMetadata[];
  rowCount: number;
  isSelected?: boolean;
}

interface ColumnMetadata {
  id: string;
  name: string;
  dataType: string;
  description: string;
  isNullable: boolean;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  isEdited?: boolean;
}

const MetadataPage: React.FC = () => {
  const { connectionStatus, setMetadata } = useAppContext();
  const [tables, setTables] = useState<TableMetadata[]>([]);
  const [selectedTable, setSelectedTable] = useState<TableMetadata | null>(null);
  const [editingColumn, setEditingColumn] = useState<string | null>(null);
  const [editingDescription, setEditingDescription] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [showKgModal, setShowKgModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [showImportModal, setShowImportModal] = useState(false);

  // Mock data for demo purposes
  useEffect(() => {
    if (connectionStatus) {
      const mockTables: TableMetadata[] = [
        {
          id: '1',
          name: 'CUSTOMERS',
          description: 'Customer information and details',
          rowCount: 15243,
          columns: [
            { id: '1-1', name: 'CUSTOMER_ID', dataType: 'VARCHAR(16)', description: 'Unique customer identifier', isNullable: false, isPrimaryKey: true, isForeignKey: false },
            { id: '1-2', name: 'FIRST_NAME', dataType: 'VARCHAR(50)', description: 'Customer first name', isNullable: false, isPrimaryKey: false, isForeignKey: false },
            { id: '1-3', name: 'LAST_NAME', dataType: 'VARCHAR(50)', description: 'Customer last name', isNullable: false, isPrimaryKey: false, isForeignKey: false },
            { id: '1-4', name: 'EMAIL', dataType: 'VARCHAR(255)', description: 'Customer email address', isNullable: false, isPrimaryKey: false, isForeignKey: false },
            { id: '1-5', name: 'PHONE', dataType: 'VARCHAR(20)', description: 'Customer phone number', isNullable: true, isPrimaryKey: false, isForeignKey: false },
            { id: '1-6', name: 'ADDRESS', dataType: 'VARCHAR(100)', description: 'Street address', isNullable: true, isPrimaryKey: false, isForeignKey: false },
            { id: '1-7', name: 'CITY', dataType: 'VARCHAR(50)', description: 'City name', isNullable: true, isPrimaryKey: false, isForeignKey: false },
            { id: '1-8', name: 'STATE', dataType: 'VARCHAR(2)', description: 'State code', isNullable: true, isPrimaryKey: false, isForeignKey: false },
            { id: '1-9', name: 'ZIP_CODE', dataType: 'VARCHAR(10)', description: 'Zip/Postal code', isNullable: true, isPrimaryKey: false, isForeignKey: false },
          ]
        },
        {
          id: '2',
          name: 'ORDERS',
          description: 'Customer order information',
          rowCount: 54321,
          columns: [
            { id: '2-1', name: 'ORDER_ID', dataType: 'VARCHAR(16)', description: 'Unique order identifier', isNullable: false, isPrimaryKey: true, isForeignKey: false },
            { id: '2-2', name: 'CUSTOMER_ID', dataType: 'VARCHAR(16)', description: 'Reference to customer', isNullable: false, isPrimaryKey: false, isForeignKey: true },
            { id: '2-3', name: 'ORDER_DATE', dataType: 'TIMESTAMP_NTZ', description: 'Date and time of order placement', isNullable: false, isPrimaryKey: false, isForeignKey: false },
            { id: '2-4', name: 'STATUS', dataType: 'VARCHAR(20)', description: 'Current order status', isNullable: false, isPrimaryKey: false, isForeignKey: false },
            { id: '2-5', name: 'TOTAL_AMOUNT', dataType: 'NUMBER(10,2)', description: 'Total order amount', isNullable: false, isPrimaryKey: false, isForeignKey: false },
          ]
        },
        {
          id: '3',
          name: 'PRODUCTS',
          description: 'Product catalog information',
          rowCount: 1250,
          columns: [
            { id: '3-1', name: 'PRODUCT_ID', dataType: 'VARCHAR(16)', description: 'Unique product identifier', isNullable: false, isPrimaryKey: true, isForeignKey: false },
            { id: '3-2', name: 'PRODUCT_NAME', dataType: 'VARCHAR(100)', description: 'Product name', isNullable: false, isPrimaryKey: false, isForeignKey: false },
            { id: '3-3', name: 'CATEGORY', dataType: 'VARCHAR(50)', description: 'Product category', isNullable: false, isPrimaryKey: false, isForeignKey: false },
            { id: '3-4', name: 'PRICE', dataType: 'NUMBER(10,2)', description: 'Product price', isNullable: false, isPrimaryKey: false, isForeignKey: false },
            { id: '3-5', name: 'DESCRIPTION', dataType: 'TEXT', description: 'Product description', isNullable: true, isPrimaryKey: false, isForeignKey: false },
            { id: '3-6', name: 'IN_STOCK', dataType: 'BOOLEAN', description: 'Availability status', isNullable: false, isPrimaryKey: false, isForeignKey: false },
          ]
        }
      ];
      
      setTables(mockTables);
      setMetadata(mockTables);
    }
  }, [connectionStatus, setMetadata]);

  const handleSelectTable = (tableId: string) => {
    const table = tables.find(t => t.id === tableId) || null;
    setSelectedTable(table);
    setEditingColumn(null);
  };

  const handleEditColumn = (columnId: string, description: string) => {
    setEditingColumn(columnId);
    setEditingDescription(description);
  };

  const handleSaveDescription = (columnId: string) => {
    if (!selectedTable) return;
    
    const updatedTable = {
      ...selectedTable,
      columns: selectedTable.columns.map(col => 
        col.id === columnId 
          ? { ...col, description: editingDescription, isEdited: true } 
          : col
      )
    };
    
    setSelectedTable(updatedTable);
    setTables(tables.map(table => 
      table.id === updatedTable.id ? updatedTable : table
    ));
    
    setEditingColumn(null);
  };

  const filteredTables = tables.filter(table => 
    table.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Mock handler for Preview Data button
  const handlePreviewData = (table: TableMetadata | null) => {
    if (!table) return;
    // Generate very simple mock data based on table name or columns
    const mockData = [
      Object.fromEntries(table.columns.slice(0, 3).map(col => [col.name, `Sample ${col.name} 1`])),
      Object.fromEntries(table.columns.slice(0, 3).map(col => [col.name, `Sample ${col.name} 2`])),
      Object.fromEntries(table.columns.slice(0, 3).map(col => [col.name, `Sample ${col.name} 3`])),
    ];
    setPreviewData(mockData);
    setShowPreviewModal(true);
  };

  // Mock handler for Export Metadata button
  const handleExportMetadata = () => {
    toast.success('Metadata export started... (Mock)');
  };

  if (!connectionStatus) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <h2 className="text-xl font-medium text-gray-900">Database Connection Required</h2>
          <p className="mt-2 text-sm text-gray-500">
            Please connect to a Snowflake database before accessing metadata
          </p>
          <a href="/connect" className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700">
            Connect to Database
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <Toaster position="top-center" reverseOrder={false} />
      <div className="py-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Schema Metadata</h1>
            <p className="mt-1 text-sm text-gray-700">
              View and customize database schema metadata for better query understanding
            </p>
          </div>
          <div className="flex space-x-2">
            <button
              type="button"
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              onClick={() => setIsEditing(!isEditing)}
              title={isEditing ? "Switch to View Mode" : "Switch to Edit Mode to modify descriptions"}
            >
              {isEditing ? (
                <>
                  <Eye className="mr-2 h-4 w-4" />
                  View Mode
                </>
              ) : (
                <>
                  <Edit2 className="mr-2 h-4 w-4" />
                  Edit Mode
                </>
              )}
            </button>
            <button
              type="button"
              className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              onClick={() => setShowKgModal(true)}
            >
              <Share2 className="mr-2 h-4 w-4" />
              Visualize Schema (KG)
            </button>
            <button
              type="button"
              className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              onClick={() => setShowImportModal(true)}
            >
              <Upload className="mr-2 h-4 w-4" />
              Import Semantic Layer
            </button>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <div className="px-4 py-4 sm:px-6 flex justify-between items-center border-b border-gray-200">
                <div className="flex items-center">
                  <h3 className="text-base text-gray-900 font-medium flex items-center">
                    <Database className="h-5 w-5 text-gray-500 mr-2" />
                    Database Tables
                  </h3>
                  <input
                    type="text"
                    placeholder="Search tables..."
                    className="ml-4 form-input block w-64 sm:text-sm border-gray-300 rounded-md"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  onClick={handleExportMetadata}
                >
                  <Download className="mr-1.5 h-4 w-4 text-gray-500" />
                  Export Metadata
                </button>
              </div>

              <div className="px-4 py-3 border-b border-gray-200">
                <div className="relative">
                  <input
                    type="text"
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    placeholder="Search tables"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    title="Search for tables by name"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="overflow-y-auto h-full">
                <ul className="divide-y divide-gray-200">
                  {filteredTables.map((table) => (
                    <li key={table.id}>
                      <button
                        className={`w-full px-3 py-3 flex items-start hover:bg-gray-50 focus:outline-none ${
                          selectedTable?.id === table.id ? 'bg-primary-50' : ''
                        }`}
                        onClick={() => handleSelectTable(table.id)}
                        title={`View details for ${table.name}`}
                      >
                        <Table2 className={`flex-shrink-0 h-5 w-5 ${selectedTable?.id === table.id ? 'text-primary-600' : 'text-gray-400'}`} />
                        <div className="ml-3 text-left">
                          <p className={`text-sm font-medium ${selectedTable?.id === table.id ? 'text-primary-600' : 'text-gray-900'}`}>
                            {table.name}
                          </p>
                          <p className="text-xs text-gray-500 mt-1 truncate w-44">
                            {table.description}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {table.columns.length} columns · {table.rowCount.toLocaleString()} rows
                          </p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {selectedTable ? (
              <>
                <div className="px-6 py-4 border-b border-gray-200 bg-white">
                  <div className="flex justify-between">
                    <div>
                      <h2 className="text-lg font-medium text-gray-900">
                        <span className="text-gray-500 font-normal">Table:</span> {selectedTable.name}
                      </h2>
                      <p className="mt-1 text-sm text-gray-500">
                        {selectedTable.description}
                      </p>
                    </div>
                    <div>
                      <button
                        type="button"
                        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                        onClick={() => handlePreviewData(selectedTable)}
                      >
                        <Database className="mr-2 h-4 w-4 text-gray-500" />
                        Preview Data
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Column Name
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Data Type
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Description
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Properties
                        </th>
                        {isEditing && (
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedTable.columns.map((column) => (
                        <tr key={column.id} className={column.isEdited ? 'bg-green-50' : ''}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {column.name}
                            {column.isPrimaryKey && (
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                PK
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <code className="bg-gray-100 px-1 py-0.5 rounded text-sm">
                              {column.dataType}
                            </code>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {editingColumn === column.id ? (
                              <div className="flex items-center">
                                <input
                                  type="text"
                                  className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                                  value={editingDescription}
                                  onChange={(e) => setEditingDescription(e.target.value)}
                                />
                                <button
                                  className="ml-2 inline-flex items-center p-1 border border-transparent rounded-full shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                                  onClick={() => handleSaveDescription(column.id)}
                                >
                                  <Save className="h-4 w-4" />
                                </button>
                              </div>
                            ) : (
                              column.description
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex space-x-2">
                              {column.isPrimaryKey && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  Primary Key
                                </span>
                              )}
                              {column.isForeignKey && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                  Foreign Key
                                </span>
                              )}
                              {column.isNullable ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                  Nullable
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                  Not Null
                                </span>
                              )}
                            </div>
                          </td>
                          {isEditing && (
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                className="text-primary-600 hover:text-primary-900"
                                onClick={() => handleEditColumn(column.id, column.description)}
                              >
                                Edit
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Added JSON representation section */}
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Mock Schema JSON (Selected Table)</h3>
                  <pre className="bg-white p-3 rounded-md text-xs text-gray-800 overflow-x-auto border border-gray-200 max-h-60">
                    <code>
                      {JSON.stringify(selectedTable, null, 2)}
                    </code>
                  </pre>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center bg-gray-50">
                <div className="text-center">
                  <Database className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No table selected</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Select a table from the list to view and edit its metadata
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <SchemaRecommendations />
            
            <div className="bg-white shadow overflow-hidden rounded-lg">
              <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200">
                <h3 className="text-base leading-6 font-medium text-gray-900 flex items-center">
                  <Table2 className="h-5 w-5 text-gray-500 mr-2" />
                  Recently Edited Tables
                </h3>
              </div>
              <div className="px-4 py-5 sm:p-6">
                <ul className="divide-y divide-gray-200">
                  {tables.filter(t => t.columns.some(c => c.isEdited)).slice(0, 3).map(table => (
                    <li key={table.id} className="py-3 flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="text-sm font-medium text-gray-900">{table.name}</span>
                        <span className="ml-2 bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full">
                          Updated
                        </span>
                      </div>
                      <button
                        className="text-sm text-primary-600 hover:text-primary-900"
                        onClick={() => handleSelectTable(table.id)}
                      >
                        View
                      </button>
                    </li>
                  ))}
                  {tables.filter(t => t.columns.some(c => c.isEdited)).length === 0 && (
                    <li className="py-4 text-center text-sm text-gray-500">
                      No recently edited tables
                    </li>
                  )}
                </ul>
              </div>
            </div>
            
            <div className="bg-white shadow overflow-hidden rounded-lg">
              <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200">
                <h3 className="text-base leading-6 font-medium text-gray-900 flex items-center">
                  <Database className="h-5 w-5 text-gray-500 mr-2" />
                  Database Overview
                </h3>
              </div>
              <div className="px-4 py-5 sm:p-6">
                <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div className="bg-gray-50 px-4 py-5 sm:p-6 rounded-lg">
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Tables</dt>
                    <dd className="mt-1 text-3xl font-semibold text-gray-900">{tables.length}</dd>
                  </div>
                  <div className="bg-gray-50 px-4 py-5 sm:p-6 rounded-lg">
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Fields</dt>
                    <dd className="mt-1 text-3xl font-semibold text-gray-900">
                      {tables.reduce((sum, table) => sum + table.columns.length, 0)}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Import Semantic Layer Modal */}
      {showImportModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <div className="absolute top-0 right-0 pt-4 pr-4">
                <button
                  type="button"
                  className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
                  onClick={() => setShowImportModal(false)}
                >
                  <span className="sr-only">Close</span>
                  <X className="h-6 w-6" />
                </button>
              </div>

              <ImportSemanticLayer />
            </div>
          </div>
        </div>
      )}

      {/* Knowledge Graph Modal */}
      {showKgModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-4xl relative flex flex-col max-h-[90vh]">
            <button 
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
              onClick={() => setShowKgModal(false)}
            >
              <X className="h-6 w-6" />
            </button>
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Schema Knowledge Graph & JSON Representation (Mock)</h3>
            <div className="grid grid-cols-2 gap-4 flex-1 overflow-hidden">
              {/* Left side: Visual KG Placeholder */}
              <div className="bg-gray-100 p-4 rounded flex justify-center items-center overflow-hidden">
                <svg width="300" height="200" viewBox="0 0 300 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-400 w-full h-auto">
                  <rect x="50" y="80" width="60" height="40" rx="4" stroke="currentColor" stroke-width="2" fill="white"/>
                  <text x="80" y="105" text-anchor="middle" fill="currentColor" font-size="10">Table A</text>
                  
                  <rect x="190" y="80" width="60" height="40" rx="4" stroke="currentColor" stroke-width="2" fill="white"/>
                  <text x="220" y="105" text-anchor="middle" fill="currentColor" font-size="10">Table B</text>

                  <rect x="120" y="150" width="60" height="40" rx="4" stroke="currentColor" stroke-width="2" fill="white"/>
                  <text x="150" y="175" text-anchor="middle" fill="currentColor" font-size="10">Table C</text>

                  <line x1="110" y1="100" x2="190" y2="100" stroke="currentColor" stroke-width="1.5"/>
                  <line x1="80" y1="120" x2="130" y2="150" stroke="currentColor" stroke-width="1.5"/>
                  <line x1="220" y1="120" x2="170" y2="150" stroke="currentColor" stroke-width="1.5"/>
                  
                  <circle cx="110" cy="100" r="3" fill="currentColor"/>
                  <circle cx="190" cy="100" r="3" fill="currentColor"/>
                  <circle cx="80" cy="120" r="3" fill="currentColor"/>
                  <circle cx="130" cy="150" r="3" fill="currentColor"/>
                   <circle cx="220" cy="120" r="3" fill="currentColor"/>
                  <circle cx="170" cy="150" r="3" fill="currentColor"/>

                  <text x="150" y="30" text-anchor="middle" font-weight="bold" fill="currentColor" font-size="14">Mock Knowledge Graph</text>
                </svg>
              </div>
              {/* Right side: JSON Representation of ALL tables */}
              <div className="bg-gray-50 p-4 rounded overflow-y-auto border border-gray-200">
                 <h4 className="text-sm font-medium text-gray-700 mb-2">Full Mock Schema JSON</h4>
                 <pre className="bg-white p-3 rounded-md text-xs text-gray-800 border border-gray-200">
                    <code>
                      {JSON.stringify(tables, null, 2)} 
                    </code>
                  </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Data Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl relative">
            <button 
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
              onClick={() => setShowPreviewModal(false)}
            >
              <X className="h-6 w-6" />
            </button>
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Preview Data: {selectedTable?.name} (Mock)</h3>
            {previewData.length > 0 ? (
              <div className="overflow-x-auto max-h-[400px]">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {Object.keys(previewData[0]).map((key) => (
                        <th key={key} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {previewData.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {Object.values(row).map((value, colIndex) => (
                          <td key={colIndex} className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">
                            {String(value)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500">No preview data available.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MetadataPage;
