import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Database, User, Bell, Settings, ChevronDown, Share2, X } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

const Navbar: React.FC = () => {
  const { connectionStatus } = useAppContext();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-2.5">
      <div className="flex flex-wrap justify-between items-center">
        <div className="flex items-center">
          <Link to="/" className="flex items-center mr-6">
            <Database className="h-6 w-6 text-primary-600 mr-2" />
            <span className="text-xl font-semibold text-gray-900">PyDough Platform</span>
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
          <button className="p-2 text-gray-500 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 mr-2" title="Notifications (Mock)">
            <Bell className="w-5 h-5" />
          </button>
          
          <button className="p-2 text-gray-500 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 mr-2" title="Settings (Mock)">
            <Settings className="w-5 h-5" />
          </button>
          
          <button 
            className="p-2 text-gray-500 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 mr-2"
            title="Share (Mock)" 
            onClick={() => setShowShareModal(true)} 
          >
            <Share2 className="w-5 h-5" />
          </button>
          
          <div className="relative">
            <button 
              className="flex items-center text-sm font-medium text-gray-700 rounded-full hover:text-primary-600 focus:outline-none"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
            >
              <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-medium">
                RK
              </div>
              <span className="mx-2 hidden md:block">Rohit Krishnan</span>
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

      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md relative">
            <button 
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
              onClick={() => setShowShareModal(false)}
            >
              <X className="h-6 w-6" />
            </button>
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Share This View (Mock)</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="share-email" className="block text-sm font-medium text-gray-700">Share with others via email:</label>
                <input 
                  type="email" 
                  id="share-email"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  placeholder="Enter email addresses..."
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Or copy link:</span>
                <button className="ml-4 inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50" disabled>
                  Copy Link
                </button>
              </div>
               <div className="pt-4 border-t border-gray-200 flex justify-end">
                 <button 
                   type="button"
                   className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 mr-3"
                   onClick={() => setShowShareModal(false)}
                 >
                   Cancel
                 </button>
                 <button 
                   type="button"
                   className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
                   disabled
                 >
                   Send
                 </button>
               </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
