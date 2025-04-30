import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Database, User, Bell, Settings, ChevronDown } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

const Navbar: React.FC = () => {
  const { connectionStatus } = useAppContext();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-2.5">
      <div className="flex flex-wrap justify-between items-center">
        <div className="flex items-center">
          <Link to="/" className="flex items-center mr-6">
            <Database className="h-6 w-6 text-primary-600 mr-2" />
            <span className="text-xl font-semibold text-gray-900">PD Platform</span>
          </Link>
          
          {connectionStatus && (
            <div className="hidden md:flex items-center">
              <div className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-1.5"></span>
                Connected to Snowflake
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center">
          <button className="p-2 text-gray-500 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 mr-2">
            <Bell className="w-5 h-5" />
          </button>
          
          <button className="p-2 text-gray-500 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 mr-2">
            <Settings className="w-5 h-5" />
          </button>
          
          <div className="relative">
            <button 
              className="flex items-center text-sm font-medium text-gray-700 rounded-full hover:text-primary-600 focus:outline-none"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
            >
              <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-medium">
                JD
              </div>
              <span className="mx-2 hidden md:block">John Doe</span>
              <ChevronDown className="w-4 h-4" />
            </button>
            
            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
                <Link to="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Your Profile</Link>
                <Link to="/settings" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Settings</Link>
                <button className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Sign out</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;