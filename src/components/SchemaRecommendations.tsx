import React, { useState } from 'react';
import { Lightbulb, Check, X, AlertCircle, ChevronRight, ChevronDown } from 'lucide-react';

interface SchemaRecommendation {
  id: string;
  table: string;
  column: string;
  currentValue: string;
  suggestedValue: string;
  type: 'description' | 'dataType' | 'relationship';
  reason: string;
  applied: boolean;
  dismissed: boolean;
}

const SchemaRecommendations: React.FC = () => {
  // Mock recommendations data - in a real app, this would come from an API
  const [recommendations, setRecommendations] = useState<SchemaRecommendation[]>([
    {
      id: '1',
      table: 'CUSTOMERS',
      column: 'CUSTOMER_ID',
      currentValue: 'Unique customer identifier',
      suggestedValue: 'Primary key that uniquely identifies each customer in the system',
      type: 'description',
      reason: 'More detailed description provides better context for natural language queries',
      applied: false,
      dismissed: false
    },
    {
      id: '2',
      table: 'ORDERS',
      column: 'STATUS',
      currentValue: 'Current order status',
      suggestedValue: 'Order fulfillment status (Pending, Processing, Shipped, Delivered, Cancelled)',
      type: 'description',
      reason: 'Enumeration of possible values helps with query understanding',
      applied: false,
      dismissed: false
    },
    {
      id: '3',
      table: 'PRODUCTS',
      column: 'PRICE',
      currentValue: 'Product price',
      suggestedValue: 'Product price in USD ($)',
      type: 'description',
      reason: 'Adding currency unit clarifies the meaning of numeric values',
      applied: false,
      dismissed: false
    },
    {
      id: '4',
      table: 'ORDERS',
      column: 'CUSTOMER_ID',
      currentValue: 'Reference to customer',
      suggestedValue: 'Foreign key reference to CUSTOMERS.CUSTOMER_ID',
      type: 'relationship',
      reason: 'Explicit relationship definition improves join suggestions in natural language queries',
      applied: false,
      dismissed: false
    }
  ]);

  const [expandedRecommendation, setExpandedRecommendation] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedRecommendation(expandedRecommendation === id ? null : id);
  };

  const applyRecommendation = (id: string) => {
    setRecommendations(recommendations.map(rec =>
      rec.id === id ? { ...rec, applied: true, dismissed: false } : rec
    ));
  };

  const dismissRecommendation = (id: string) => {
    setRecommendations(recommendations.map(rec =>
      rec.id === id ? { ...rec, dismissed: true, applied: false } : rec
    ));
  };

  const activeRecommendations = recommendations.filter(rec => !rec.applied && !rec.dismissed);
  const appliedRecommendations = recommendations.filter(rec => rec.applied);
  const dismissedRecommendations = recommendations.filter(rec => rec.dismissed);

  if (activeRecommendations.length === 0 && appliedRecommendations.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center">
          <Lightbulb className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No Schema Recommendations</h3>
          <p className="mt-1 text-sm text-gray-500">
            AI will analyze your schema and suggest improvements as you use the system
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-4 border-b border-gray-200 bg-primary-50">
        <h2 className="text-lg font-medium text-gray-900 flex items-center">
          <Lightbulb className="h-5 w-5 mr-2 text-amber-500" />
          AI Schema Recommendations
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Suggested metadata improvements based on query patterns and best practices
        </p>
      </div>

      {activeRecommendations.length > 0 && (
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-sm font-medium text-gray-900">Active Recommendations ({activeRecommendations.length})</h3>
          <ul className="mt-3 divide-y divide-gray-200">
            {activeRecommendations.map((rec) => (
              <li key={rec.id} className="py-3">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {rec.table}.{rec.column}
                      </p>
                      <span className={`ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        rec.type === 'description' ? 'bg-green-100 text-green-800' :
                        rec.type === 'relationship' ? 'bg-blue-100 text-blue-800' :
                        'bg-purple-100 text-purple-800'
                      }`}>
                        {rec.type}
                      </span>
                    </div>
                    <button
                      className="mt-1 flex items-center text-sm text-primary-600"
                      onClick={() => toggleExpand(rec.id)}
                    >
                      {expandedRecommendation === rec.id ? (
                        <ChevronDown className="h-4 w-4 mr-1" />
                      ) : (
                        <ChevronRight className="h-4 w-4 mr-1" />
                      )}
                      Details
                    </button>
                  </div>
                  <div className="ml-4 flex-shrink-0 flex">
                    <button
                      className="mr-2 p-1 rounded-full bg-green-50 text-green-700 hover:bg-green-100"
                      onClick={() => applyRecommendation(rec.id)}
                      title="Apply recommendation"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      className="p-1 rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-500"
                      onClick={() => dismissRecommendation(rec.id)}
                      title="Dismiss recommendation"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {expandedRecommendation === rec.id && (
                  <div className="mt-2 text-sm">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 p-3 rounded-md">
                        <p className="text-xs font-medium text-gray-500 mb-1">Current Value</p>
                        <p className="text-gray-900">{rec.currentValue}</p>
                      </div>
                      <div className="bg-green-50 p-3 rounded-md">
                        <p className="text-xs font-medium text-gray-500 mb-1">Suggested Value</p>
                        <p className="text-gray-900">{rec.suggestedValue}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-start bg-amber-50 p-3 rounded-md">
                      <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 mr-2 flex-shrink-0" />
                      <p className="text-gray-700">{rec.reason}</p>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {appliedRecommendations.length > 0 && (
        <div className="p-4">
          <h3 className="text-sm font-medium text-gray-500">Applied ({appliedRecommendations.length})</h3>
          <ul className="mt-2 divide-y divide-gray-100">
            {appliedRecommendations.map((rec) => (
              <li key={rec.id} className="py-2">
                <div className="flex items-center text-sm">
                  <Check className="h-4 w-4 text-green-500 mr-2" />
                  <span className="text-gray-600">
                    Updated {rec.table}.{rec.column} {rec.type}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default SchemaRecommendations;
