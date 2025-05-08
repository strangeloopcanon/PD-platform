import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { MessageSquare, User, Bot, Code, Database, ChevronDown, ChevronUp, Copy, ExternalLink } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const ConversationVisualizer: React.FC = () => {
  const { queryHistory } = useAppContext();
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());
  const [activeTabs, setActiveTabs] = useState<Record<string, 'sql' | 'pydough'>>({});

  const toggleMessageExpansion = (id: string) => {
    const newExpanded = new Set(expandedMessages);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedMessages(newExpanded);
  };

  const switchTab = (id: string, tab: 'sql' | 'pydough') => {
    setActiveTabs({
      ...activeTabs,
      [id]: tab,
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Could add a toast notification here
  };

  if (queryHistory.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No conversation yet</h3>
        <p className="mt-1 text-sm text-gray-500">Start a query to begin the conversation</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
        <h2 className="text-lg font-medium text-gray-900 flex items-center">
          <MessageSquare className="h-5 w-5 mr-2 text-gray-500" />
          Conversation History
        </h2>
        <div className="flex space-x-2">
          <button className="text-xs text-primary-600 hover:text-primary-800 flex items-center">
            <ExternalLink className="h-3 w-3 mr-1" />
            Export
          </button>
        </div>
      </div>

      <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
        {queryHistory.map((message) => {
          const isExpanded = expandedMessages.has(message.id);
          const activeTab = activeTabs[message.id] || 'sql';
          
          return (
            <div 
              key={message.id} 
              className={`p-4 ${message.role === 'user' ? 'bg-gray-50' : 'bg-white'}`}
            >
              <div className="flex items-start">
                <div className={`flex-shrink-0 rounded-full p-1 ${
                  message.role === 'user' ? 'bg-primary-100' : 'bg-green-100'
                }`}>
                  {message.role === 'user' ? (
                    <User className="h-4 w-4 text-primary-700" />
                  ) : (
                    <Bot className="h-4 w-4 text-green-700" />
                  )}
                </div>
                <div className="ml-3 flex-1">
                  <div className="text-sm text-gray-900">
                    {message.role === 'user' ? (
                      <p className="font-medium">You</p>
                    ) : (
                      <p className="font-medium">Assistant</p>
                    )}
                    <div className="mt-1 text-sm text-gray-700">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        className="prose prose-sm max-w-none"
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                  
                  {message.role === 'assistant' && message.code && (
                    <div className="mt-2">
                      <div className="flex border-b border-gray-200">
                        <button
                          className={`px-3 py-2 text-xs font-medium ${
                            activeTab === 'sql' 
                              ? 'text-primary-700 border-b-2 border-primary-500'
                              : 'text-gray-500 hover:text-gray-700'
                          }`}
                          onClick={() => switchTab(message.id, 'sql')}
                        >
                          SQL
                        </button>
                        <button
                          className={`px-3 py-2 text-xs font-medium ${
                            activeTab === 'pydough' 
                              ? 'text-primary-700 border-b-2 border-primary-500'
                              : 'text-gray-500 hover:text-gray-700'
                          }`}
                          onClick={() => switchTab(message.id, 'pydough')}
                        >
                          PyDough
                        </button>
                      </div>
                      
                      <div className="relative bg-gray-800 text-white rounded-b-md overflow-hidden">
                        <button
                          className="absolute top-2 right-2 p-1 rounded-md hover:bg-gray-700"
                          onClick={() => copyToClipboard(
                            activeTab === 'sql' ? message.code?.sql || '' : message.code?.pydough || ''
                          )}
                        >
                          <Copy className="h-4 w-4 text-gray-300" />
                        </button>
                        <pre className="p-4 text-xs font-mono overflow-x-auto">
                          <code>{activeTab === 'sql' ? message.code.sql : message.code.pydough}</code>
                        </pre>
                      </div>
                    </div>
                  )}
                  
                  {message.role === 'assistant' && message.explanation && (
                    <div className="mt-2 relative">
                      <button
                        className="text-xs text-primary-600 hover:text-primary-800 flex items-center"
                        onClick={() => toggleMessageExpansion(message.id)}
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="h-3 w-3 mr-1" />
                            Hide explanation
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-3 w-3 mr-1" />
                            Show explanation
                          </>
                        )}
                      </button>
                      
                      {isExpanded && (
                        <div className="mt-2 p-3 bg-amber-50 rounded-md text-xs text-gray-800">
                          <h4 className="font-medium flex items-center mb-1">
                            <Database className="h-3 w-3 mr-1 text-amber-600" />
                            Query Explanation
                          </h4>
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            className="prose prose-sm max-w-none"
                          >
                            {message.explanation}
                          </ReactMarkdown>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="mt-1 text-xs text-gray-500">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ConversationVisualizer; 