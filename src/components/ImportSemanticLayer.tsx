import React, { useState } from 'react';
import { FileJson, Upload, CheckCircle, HelpCircle, XCircle, Layers, AlertCircle, FileText } from 'lucide-react';

const ImportSemanticLayer: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<'upload' | 'mapping' | 'review' | 'complete'>('upload');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [importSource, setImportSource] = useState<'dbt' | 'yaml' | 'json'>('dbt');
  const [mappingStatus, setMappingStatus] = useState<'pending' | 'in-progress' | 'complete' | 'error'>('pending');
  const [mappedEntities, setMappedEntities] = useState<{
    models: number;
    metrics: number;
    dimensions: number;
    unmapped: number;
  }>({ models: 0, metrics: 0, dimensions: 0, unmapped: 0 });
  const [showExampleModal, setShowExampleModal] = useState(false);

  // Sample file examples
  const examples = {
    dbt: `{
  "metadata": {
    "dbt_schema_version": "1.0",
    "dbt_version": "1.5.0"
  },
  "metrics": [
    {
      "name": "total_revenue",
      "label": "Total Revenue",
      "model": "orders",
      "description": "Total revenue from all orders",
      "calculation_method": "sum",
      "expression": "amount",
      "timestamp": "ordered_at",
      "dimensions": ["customer_id", "product_id"]
    }
  ],
  "models": [
    {
      "name": "orders",
      "columns": [
        {
          "name": "order_id",
          "description": "Unique order identifier",
          "data_type": "string",
          "meta": {
            "dimension": true,
            "primary_key": true
          }
        },
        {
          "name": "amount",
          "description": "Order amount in USD",
          "data_type": "numeric"
        }
      ]
    }
  ]
}`,
    yaml: `# Semantic Layer Definition
version: 1.0
models:
  - name: customers
    description: Customer information and details
    columns:
      - name: customer_id
        description: Primary key that uniquely identifies each customer
        type: VARCHAR
        primary_key: true
      - name: email
        description: Customer email address
        type: VARCHAR
  - name: orders
    description: Order transaction data
    columns:
      - name: order_id
        description: Primary key for orders
        type: VARCHAR
        primary_key: true
      - name: customer_id
        description: Foreign key to customers table
        type: VARCHAR
        references: customers.customer_id
      - name: amount
        description: Order amount in USD
        type: NUMERIC

metrics:
  - name: total_order_amount
    description: Sum of all order amounts
    expression: SUM(orders.amount)`,
    json: `{
  "schema": {
    "tables": [
      {
        "name": "customers",
        "description": "Customer information",
        "columns": [
          {
            "name": "customer_id",
            "dataType": "varchar",
            "isPrimaryKey": true,
            "description": "Unique identifier for the customer"
          },
          {
            "name": "name",
            "dataType": "varchar",
            "description": "Customer's full name"
          }
        ]
      },
      {
        "name": "orders",
        "description": "Order information",
        "columns": [
          {
            "name": "order_id",
            "dataType": "varchar",
            "isPrimaryKey": true,
            "description": "Unique identifier for the order"
          },
          {
            "name": "customer_id",
            "dataType": "varchar",
            "description": "Reference to customer table",
            "foreignKey": {
              "table": "customers",
              "column": "customer_id"
            }
          }
        ]
      }
    ]
  }
}`
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setUploadedFile(files[0]);
    }
  };

  const handleContinue = () => {
    if (currentStep === 'upload' && uploadedFile) {
      setCurrentStep('mapping');
      // Simulate processing
      setMappingStatus('in-progress');
      setTimeout(() => {
        setMappingStatus('complete');
        setMappedEntities({
          models: 12,
          metrics: 8,
          dimensions: 15,
          unmapped: 2
        });
      }, 1500);
    } else if (currentStep === 'mapping') {
      setCurrentStep('review');
    } else if (currentStep === 'review') {
      setCurrentStep('complete');
    }
  };

  const renderUploadStep = () => (
    <div className="p-6">
      <h3 className="text-lg font-medium text-gray-900">Upload Semantic Layer File</h3>
      <p className="mt-1 text-sm text-gray-500">
        Import your semantic layer definitions from dbt or other compatible formats
      </p>

      <div className="mt-4 space-y-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <input
              id="dbt"
              name="import-source"
              type="radio"
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
              checked={importSource === 'dbt'}
              onChange={() => setImportSource('dbt')}
            />
            <label htmlFor="dbt" className="ml-2 block text-sm font-medium text-gray-700">
              dbt Semantic Layer
            </label>
          </div>
          <div className="flex items-center">
            <input
              id="yaml"
              name="import-source"
              type="radio"
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
              checked={importSource === 'yaml'}
              onChange={() => setImportSource('yaml')}
            />
            <label htmlFor="yaml" className="ml-2 block text-sm font-medium text-gray-700">
              YAML Definition
            </label>
          </div>
          <div className="flex items-center">
            <input
              id="json"
              name="import-source"
              type="radio"
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
              checked={importSource === 'json'}
              onChange={() => setImportSource('json')}
            />
            <label htmlFor="json" className="ml-2 block text-sm font-medium text-gray-700">
              JSON Schema
            </label>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex justify-between">
            <label className="block text-sm font-medium text-gray-700">Upload File</label>
            <button
              type="button"
              className="text-primary-600 text-sm font-medium flex items-center hover:text-primary-500"
              onClick={() => setShowExampleModal(true)}
            >
              <FileText className="h-4 w-4 mr-1" />
              View Example
            </button>
          </div>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
            <div className="space-y-1 text-center">
              <FileJson className="mx-auto h-12 w-12 text-gray-400" />
              <div className="flex text-sm text-gray-600">
                <label
                  htmlFor="file-upload"
                  className="relative cursor-pointer bg-white rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500"
                >
                  <span>Upload a file</span>
                  <input
                    id="file-upload"
                    name="file-upload"
                    type="file"
                    className="sr-only"
                    accept=".yml,.yaml,.json"
                    onChange={handleFileUpload}
                  />
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-gray-500">
                {importSource === 'dbt' ? 'manifest.json, metrics.yml' :
                 importSource === 'yaml' ? 'YAML up to 10MB' : 'JSON up to 10MB'}
              </p>
            </div>
          </div>
          {uploadedFile && (
            <div className="mt-2 flex items-center text-sm text-gray-500">
              <CheckCircle className="h-4 w-4 text-green-500 mr-1.5" />
              {uploadedFile.name} ({Math.round(uploadedFile.size / 1024)} KB)
            </div>
          )}
        </div>
      </div>

      {/* Example Modal */}
      {showExampleModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg font-medium leading-6 text-gray-900 flex items-center">
                      <FileText className="h-5 w-5 mr-2 text-primary-600" />
                      Example {importSource.toUpperCase()} File
                    </h3>
                    <div className="mt-4">
                      <pre className="bg-gray-50 p-4 rounded-md text-sm text-gray-800 overflow-auto max-h-80 border border-gray-200">
                        {examples[importSource]}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => setShowExampleModal(false)}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => {
                    navigator.clipboard.writeText(examples[importSource]);
                  }}
                >
                  Copy to Clipboard
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderMappingStep = () => (
    <div className="p-6">
      <h3 className="text-lg font-medium text-gray-900">Mapping Semantic Definitions</h3>
      <p className="mt-1 text-sm text-gray-500">
        We're analyzing your semantic layer definitions and mapping them to database entities
      </p>

      <div className="mt-6">
        {mappingStatus === 'in-progress' ? (
          <div className="text-center py-8">
            <svg className="animate-spin mx-auto h-8 w-8 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="mt-4 text-sm font-medium text-gray-700">Mapping entities...</p>
          </div>
        ) : mappingStatus === 'complete' ? (
          <div className="space-y-4">
            <div className="bg-green-50 border-l-4 border-green-400 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-green-700">
                    Semantic layer mapping complete! Found {mappedEntities.models + mappedEntities.metrics + mappedEntities.dimensions} entities.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 bg-primary-100 rounded-md p-3">
                      <Layers className="h-5 w-5 text-primary-600" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Models</dt>
                        <dd className="text-lg font-semibold text-gray-900">{mappedEntities.models}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 bg-amber-100 rounded-md p-3">
                      <FileJson className="h-5 w-5 text-amber-600" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Metrics</dt>
                        <dd className="text-lg font-semibold text-gray-900">{mappedEntities.metrics}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
                      <HelpCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Dimensions</dt>
                        <dd className="text-lg font-semibold text-gray-900">{mappedEntities.dimensions}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 bg-red-100 rounded-md p-3">
                      <AlertCircle className="h-5 w-5 text-red-600" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Unmapped</dt>
                        <dd className="text-lg font-semibold text-gray-900">{mappedEntities.unmapped}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {mappedEntities.unmapped > 0 && (
              <div className="bg-amber-50 border-l-4 border-amber-400 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <AlertCircle className="h-5 w-5 text-amber-400" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-amber-700">
                      {mappedEntities.unmapped} entities couldn't be automatically mapped. You can manually map them in the next step.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : mappingStatus === 'error' ? (
          <div className="bg-red-50 border-l-4 border-red-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <XCircle className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">
                  An error occurred while mapping entities. Please check your file format and try again.
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );

  const renderReviewStep = () => (
    <div className="p-6">
      <h3 className="text-lg font-medium text-gray-900">Review Semantic Layer</h3>
      <p className="mt-1 text-sm text-gray-500">
        Review and confirm the mapped entities before finalizing the import
      </p>

      <div className="mt-6">
        <div className="border border-gray-300 rounded-md overflow-hidden">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">Entity</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Type</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Source</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {[
                { name: 'order_items', type: 'Model', source: 'public.orders', status: 'mapped' },
                { name: 'customers', type: 'Model', source: 'public.customers', status: 'mapped' },
                { name: 'total_revenue', type: 'Metric', source: 'sum(order_items.amount)', status: 'mapped' },
                { name: 'avg_order_value', type: 'Metric', source: 'avg(order_items.amount)', status: 'mapped' },
                { name: 'customer_segment', type: 'Dimension', source: 'customers.segment', status: 'mapped' },
                { name: 'unknown_entity', type: 'Model', source: '?', status: 'unmapped' },
              ].map((entity) => (
                <tr key={entity.name}>
                  <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900">{entity.name}</td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{entity.type}</td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{entity.source}</td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    {entity.status === 'mapped' ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle className="mr-1 h-3 w-3" /> Mapped
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                        <AlertCircle className="mr-1 h-3 w-3" /> Needs Mapping
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderCompleteStep = () => (
    <div className="p-6 text-center">
      <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
      <h3 className="mt-2 text-lg font-medium text-gray-900">Import Complete!</h3>
      <p className="mt-1 text-sm text-gray-500">
        Your semantic layer has been successfully imported and is ready to use
      </p>
      <div className="mt-6">
        <button
          type="button"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          onClick={() => window.location.href = '/metadata'}
        >
          Go to Metadata
        </button>
      </div>
    </div>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 'upload':
        return renderUploadStep();
      case 'mapping':
        return renderMappingStep();
      case 'review':
        return renderReviewStep();
      case 'complete':
        return renderCompleteStep();
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200">
        <h2 className="text-lg font-medium text-gray-900 flex items-center">
          <Upload className="h-5 w-5 mr-2 text-primary-600" />
          Import Semantic Layer
        </h2>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex" aria-label="Tabs">
          {[
            { id: 'upload', name: 'Upload' },
            { id: 'mapping', name: 'Mapping' },
            { id: 'review', name: 'Review' },
            { id: 'complete', name: 'Complete' },
          ].map((tab, i) => {
            const isCurrent = currentStep === tab.id;
            const isPrevious = ['upload', 'mapping', 'review', 'complete'].indexOf(currentStep) >
                              ['upload', 'mapping', 'review', 'complete'].indexOf(tab.id);

            return (
              <button
                key={tab.id}
                disabled={!isPrevious && !isCurrent}
                className={`${
                  isCurrent
                    ? 'border-primary-500 text-primary-600'
                    : isPrevious
                    ? 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    : 'border-transparent text-gray-400 cursor-not-allowed'
                } w-1/4 py-4 px-1 text-center border-b-2 font-medium text-sm flex flex-col items-center justify-center`}
              >
                <div className={`flex items-center justify-center h-6 w-6 rounded-full text-xs ${
                  isCurrent
                    ? 'bg-primary-100 text-primary-700'
                    : isPrevious
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-400'
                }`}>
                  {i + 1}
                </div>
                <span className="mt-1">{tab.name}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {renderStepContent()}

      {currentStep !== 'complete' && (
        <div className="px-4 py-3 bg-gray-50 text-right sm:px-6 border-t border-gray-200">
          <button
            type="button"
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            onClick={handleContinue}
            disabled={currentStep === 'upload' && !uploadedFile}
          >
            {currentStep === 'review' ? 'Finalize Import' : 'Continue'}
          </button>
        </div>
      )}
    </div>
  );
};

export default ImportSemanticLayer;
