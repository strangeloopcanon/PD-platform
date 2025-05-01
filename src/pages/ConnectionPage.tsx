import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Database, Lock, Key, Server } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const ConnectionPage: React.FC = () => {
  const navigate = useNavigate();
  const { setConnectionStatus } = useAppContext();
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    accountName: '',
    username: '',
    password: '',
    warehouse: '',
    database: '',
    schema: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsConnecting(true);
    setConnectionError(null);
    
    // Simulate connection request
    setTimeout(() => {
      if (formData.accountName && formData.username && formData.password) {
        setConnectionStatus(true);
        setIsConnecting(false);
        navigate('/metadata');
      } else {
        setConnectionError('Connection failed. Please check your credentials and try again.');
        setIsConnecting(false);
      }
    }, 1500);
  };

  const connectionFields = [
    { name: 'accountName', label: 'Account Name', placeholder: 'your-account', icon: Database, required: true },
    { name: 'username', label: 'Username', placeholder: 'username', icon: Server, required: true },
    { name: 'password', label: 'Password', placeholder: '••••••••', type: 'password', icon: Lock, required: true },
    { name: 'warehouse', label: 'Warehouse', placeholder: 'COMPUTE_WH', icon: Database },
    { name: 'database', label: 'Database', placeholder: 'SALES', icon: Database },
    { name: 'schema', label: 'Schema', placeholder: 'PUBLIC', icon: Database },
  ];

  const testConnectionConfigs = [
    { name: 'Sample Sales Database', description: 'Contains sample sales data for testing' },
    { name: 'E-commerce Database', description: 'Sample e-commerce transactional data' },
    { name: 'Financial Analytics DB', description: 'Financial data for analytics testing' },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="py-6">
        <h1 className="text-2xl font-semibold text-gray-900">Connect to Snowflake</h1>
        <p className="mt-2 text-sm text-gray-700">
          Connect to your Snowflake database to start analyzing your data
        </p>

        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="md:col-span-2">
            <div className="bg-white shadow-sm rounded-lg overflow-hidden">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium leading-6 text-gray-900">Connection Details</h3>
                
                {connectionError && (
                  <div className="mt-4 bg-red-50 border-l-4 border-red-400 p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-red-700">{connectionError}</p>
                      </div>
                    </div>
                  </div>
                )}
                
                <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    {connectionFields.map((field) => (
                      <div key={field.name}>
                        <label htmlFor={field.name} className="block text-sm font-medium text-gray-700">
                          {field.label} {field.required && <span className="text-red-500">*</span>}
                        </label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <field.icon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                          </div>
                          <input
                            type={field.type || 'text'}
                            name={field.name}
                            id={field.name}
                            className="focus:ring-primary-500 focus:border-primary-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                            placeholder={field.placeholder}
                            required={field.required}
                            value={formData[field.name as keyof typeof formData]}
                            onChange={handleChange}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="pt-3 border-t border-gray-200">
                    <div className="flex justify-end">
                      <button
                        type="button"
                        className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                      >
                        Test Connection
                      </button>
                      <button
                        type="submit"
                        className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                        disabled={isConnecting}
                      >
                        {isConnecting ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Connecting...
                          </>
                        ) : 'Connect'}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="bg-white shadow-sm rounded-lg overflow-hidden">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-sm font-medium text-gray-900">Connection Help</h3>
                <div className="mt-2 text-sm text-gray-500">
                  <p>The account name is typically your Snowflake account identifier.</p>
                  <p className="mt-2">Example: <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">company-account</code></p>
                  <p className="mt-3">Need help finding your account details?</p>
                  <a href="#" className="mt-2 inline-block text-primary-600 hover:text-primary-500">View Snowflake documentation →</a>
                </div>
              </div>
            </div>
            
            <div className="bg-white shadow-sm rounded-lg overflow-hidden">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-sm font-medium text-gray-900">Test Connections</h3>
                <p className="mt-1 text-xs text-gray-500">Use these pre-configured connections for testing:</p>
                
                <ul className="mt-3 space-y-3">
                  {testConnectionConfigs.map((config, index) => (
                    <li key={index} className="flex items-start">
                      <button
                        type="button"
                        className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-primary-700 bg-primary-100 hover:bg-primary-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                      >
                        <Key className="h-3.5 w-3.5 mr-1" />
                        Use
                      </button>
                      <div className="ml-3">
                        <p className="text-xs font-medium text-gray-900">{config.name}</p>
                        <p className="text-xs text-gray-500">{config.description}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConnectionPage;
