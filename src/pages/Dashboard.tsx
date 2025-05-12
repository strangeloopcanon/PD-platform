import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Database, FileJson, Search, BarChart3, CheckCircle, RefreshCw, Zap } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const Dashboard: React.FC = () => {
  const { 
    connectionStatus, 
    availableDatabases, 
    scanDatabases,
    detectedDomain,
    queryHistoryItems,
    connectDatabase,
    isLoading,
    setError
  } = useAppContext();

  // Scan for available databases on load
  useEffect(() => {
    if (availableDatabases.length === 0) {
      scanDatabases();
    }
  }, [availableDatabases.length, scanDatabases]);

  // Force connect all databases
  const handleForceConnectAll = async () => {
    try {
      setError(null);
      console.log("Dashboard: Force connecting all databases...");

      // Connect to each available database
      if (availableDatabases.length > 0) {
        for (const db of availableDatabases) {
          if (!db.connected && db.exists) {
            console.log(`Connecting to ${db.name}...`);
            await connectDatabase(db.name);
            // Add a small delay between connections
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        }
        console.log("All database connections complete");
      }
    } catch (error) {
      console.error('Connection error:', error);
    }
  };

  const workflows = [
    { 
      name: 'Connect to Database', 
      href: '/connect',
      icon: Database,
      description: 'Connect to your database and manage connection settings',
      status: connectionStatus ? 'complete' : 'required'
    },
    { 
      name: 'Schema to Metadata', 
      href: '/metadata',
      icon: FileJson,
      description: 'Convert database schema to metadata and edit field properties',
      status: connectionStatus ? 'available' : 'locked'
    },
    { 
      name: 'Natural Language Query', 
      href: '/query',
      icon: Search,
      description: 'Query your data using natural language, transformed to PyDough and SQL',
      status: connectionStatus ? 'available' : 'locked'
    },
    { 
      name: 'Notebook Analysis', 
      href: '/notebook',
      icon: BarChart3,
      description: 'Analyze your data with Jupyter-like notebook and AI copilot assistance',
      status: connectionStatus ? 'available' : 'locked'
    }
  ];

  // Get recent activities from query history
  const recentActivities = queryHistoryItems.slice(0, 3);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="py-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          
          {/* Force Connect All Databases Button */}
          {!connectionStatus && availableDatabases.length > 0 && (
            <button
              onClick={handleForceConnectAll}
              className="animate-pulse inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              disabled={isLoading}
            >
              <Zap className="h-5 w-5 mr-2" />
              {isLoading ? 'Connecting...' : 'Connect All Databases'}
            </button>
          )}
        </div>
        
        <p className="mt-2 text-sm text-gray-700">
          Welcome to the PyDough analytics platform. Follow the steps below to analyze your data.
        </p>

        {connectionStatus && (
          <div className="mt-4 bg-green-50 border-l-4 border-green-400 p-4">
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

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {workflows.map((workflow) => (
            <Link
              key={workflow.name}
              to={workflow.status !== 'locked' ? workflow.href : '#'}
              className={`relative rounded-lg border p-5 shadow-sm hover:shadow-md transition-all duration-200 ${
                workflow.status === 'locked' 
                  ? 'bg-gray-50 cursor-not-allowed opacity-60'
                  : workflow.status === 'complete'
                  ? 'bg-green-50 border-green-200'
                  : 'bg-white hover:border-primary-200'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className={`rounded-md p-2 ${
                  workflow.status === 'complete' 
                    ? 'bg-green-100 text-green-700'
                    : workflow.status === 'required'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-primary-100 text-primary-700'
                }`}>
                  <workflow.icon className="h-6 w-6" />
                </div>
                <h3 className="text-base font-medium text-gray-900">{workflow.name}</h3>
              </div>
              
              <p className="mt-3 text-sm text-gray-500">{workflow.description}</p>
              
              {workflow.status === 'locked' && (
                <div className="absolute top-3 right-3">
                  <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                    Requires connection
                  </span>
                </div>
              )}
              
              {workflow.status === 'complete' && (
                <div className="absolute top-3 right-3">
                  <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                    Complete
                  </span>
                </div>
              )}
            </Link>
          ))}
        </div>

        {/* Available Databases Section */}
        <div className="mt-10">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-gray-900">Available Databases</h2>
            <button
              onClick={() => scanDatabases()}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableDatabases.map((db) => (
              <div 
                key={db.name}
                className={`bg-white rounded-lg shadow-sm border p-4 ${
                  db.connected ? 'border-green-200' : 'border-gray-200'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center">
                    <Database className="h-5 w-5 text-gray-500 mr-2" />
                    <h3 className="text-sm font-medium text-gray-900">{db.name}</h3>
                  </div>
                  {db.connected && (
                    <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Connected
                    </span>
                  )}
                </div>
                <p className="mt-2 text-xs text-gray-500 truncate">{db.databaseFile}</p>
                <div className="mt-3 flex flex-wrap gap-1">
                  {db.keywords.slice(0, 3).map((keyword, idx) => (
                    <span 
                      key={idx} 
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
                    >
                      {keyword}
                    </span>
                  ))}
                  {db.keywords.length > 3 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                      +{db.keywords.length - 3} more
                    </span>
                  )}
                </div>
                <div className="mt-4">
                  <Link
                    to="/connect"
                    className="text-sm font-medium text-primary-600 hover:text-primary-500"
                  >
                    {db.connected ? 'View connection' : 'Connect'}
                  </Link>
                </div>
              </div>
            ))}
            
            {availableDatabases.length === 0 && (
              <div className="col-span-3 bg-gray-50 rounded-lg p-6 text-center">
                <Database className="h-8 w-8 text-gray-400 mx-auto" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No databases found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Refresh to scan for available databases or go to the Connect page.
                </p>
                <div className="mt-4">
                  <Link
                    to="/connect"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
                  >
                    Go to Connect Page
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-10">
          <h2 className="text-lg font-medium text-gray-900">Recent Activity</h2>
          
          <div className="mt-4 overflow-hidden bg-white shadow sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {connectionStatus && recentActivities.length > 0 ? (
                recentActivities.map((activity) => (
                  <li key={activity.id}>
                    <div className="block hover:bg-gray-50">
                      <div className="px-4 py-4 sm:px-6">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-primary-600 truncate">{activity.query}</p>
                          <div className="ml-2 flex-shrink-0 flex">
                            {activity.domain && (
                              <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                {activity.domain}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="mt-2 sm:flex sm:justify-between">
                          <div className="sm:flex">
                            <p className="flex items-center text-sm text-gray-500">
                              <Search className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                              Natural Language Query
                            </p>
                          </div>
                          <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                            <p>
                              {new Date(activity.timestamp).toLocaleDateString()} at{' '}
                              {new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))
              ) : (
                <li>
                  <div className="px-4 py-8 sm:px-6 text-center">
                    <p className="text-sm text-gray-500">Connect to a database to see your recent activity</p>
                    <Link to="/connect" className="mt-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700">
                      Connect Now
                    </Link>
                  </div>
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
