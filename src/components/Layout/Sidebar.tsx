import React from 'react';
import { NavLink } from 'react-router-dom';
import { Database, FileJson, Search, BarChart3, Home } from 'lucide-react';

const Sidebar: React.FC = () => {
  const navigation = [
    { name: 'Dashboard', href: '/', icon: Home, description: 'Overview and main workflows' },
    { name: 'Connect', href: '/connect', icon: Database, description: 'Connect to your Snowflake database' },
    { name: 'Metadata', href: '/metadata', icon: FileJson, description: 'View and manage schema metadata' },
    { name: 'Query', href: '/query', icon: Search, description: 'Query data using natural language' },
    { name: 'Notebook', href: '/notebook', icon: BarChart3, description: 'Analyze data with code notebooks' },
  ];

  return (
    <aside className="w-64 bg-white border-r border-gray-200 hidden md:block">
      <div className="h-full px-3 py-4 overflow-y-auto">
        <ul className="space-y-2">
          {navigation.map((item) => (
            <li key={item.name}>
              <NavLink
                to={item.href}
                className={({ isActive }) =>
                  `flex items-center p-2 text-base font-normal rounded-lg ${
                    isActive
                      ? 'bg-primary-100 text-primary-800'
                      : 'text-gray-900 hover:bg-gray-100'
                  }`
                }
                title={item.description}
              >
                <item.icon className="w-6 h-6 text-gray-500 transition duration-75 group-hover:text-gray-900" />
                <span className="ml-3">{item.name}</span>
              </NavLink>
            </li>
          ))}
        </ul>
        
        <div className="pt-4 mt-4 border-t border-gray-200">
          <div className="px-3 py-2">
            <h3 className="text-sm font-medium text-gray-500 uppercase">Recent Notebooks</h3>
            <ul className="mt-2 space-y-1">
              <li>
                <a href="#" className="block px-3 py-1 text-sm text-gray-700 rounded-lg hover:bg-gray-100">
                  Monthly Sales Analysis
                </a>
              </li>
              <li>
                <a href="#" className="block px-3 py-1 text-sm text-gray-700 rounded-lg hover:bg-gray-100">
                  Customer Segmentation
                </a>
              </li>
              <li>
                <a href="#" className="block px-3 py-1 text-sm text-gray-700 rounded-lg hover:bg-gray-100">
                  Inventory Forecasting
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
