import React from 'react';
import { Link } from 'react-router-dom';
import { Database, FileJson, Search, BarChart3 } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const Dashboard: React.FC = () => {
  const { connectionStatus } = useAppContext();

  const workflows = [
    { 
      name: 'Connect to Database', 
      href: '/connect',
      icon: Database,
      description: 'Connect to your Snowflake database and manage connection settings',
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="py-6">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-sm text-gray-700">
          Welcome to the DataFlow analytics platform. Follow the steps below to analyze your data.
        </p>

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

        <div className="mt-10">
          <h2 className="text-lg font-medium text-gray-900">Recent Activity</h2>
          
          <div className="mt-4 overflow-hidden bg-white shadow sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {connectionStatus ? (
                <>
                  <li>
                    <div className="block hover:bg-gray-50">
                      <div className="px-4 py-4 sm:px-6">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-primary-600 truncate">Customer Segmentation Query</p>
                          <div className="ml-2 flex-shrink-0 flex">
                            <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              Successful
                            </p>
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
                            <p>10 minutes ago</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                  <li>
                    <div className="block hover:bg-gray-50">
                      <div className="px-4 py-4 sm:px-6">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-primary-600 truncate">Monthly Sales Analysis</p>
                          <div className="ml-2 flex-shrink-0 flex">
                            <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              Completed
                            </p>
                          </div>
                        </div>
                        <div className="mt-2 sm:flex sm:justify-between">
                          <div className="sm:flex">
                            <p className="flex items-center text-sm text-gray-500">
                              <BarChart3 className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                              Notebook Analysis
                            </p>
                          </div>
                          <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                            <p>2 hours ago</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                </>
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
