import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Star, Clock, Tag, Search, Trash2, Calendar, Filter, BookOpen, X } from 'lucide-react';

const QueryHistory: React.FC = () => {
  const { queryHistoryItems, toggleFavorite, addTagToHistory, removeTagFromHistory } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [editingTagsFor, setEditingTagsFor] = useState<string | null>(null);
  const [filterTag, setFilterTag] = useState<string | null>(null);

  // Get all unique tags across history items
  const allTags = Array.from(
    new Set(queryHistoryItems.flatMap(item => item.tags))
  );

  // Filter history items based on search term, favorites filter, and tag filter
  const filteredItems = queryHistoryItems.filter(item => {
    const matchesSearch = item.query.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFavorite = showFavoritesOnly ? item.favorite : true;
    const matchesTag = filterTag ? item.tags.includes(filterTag) : true;
    return matchesSearch && matchesFavorite && matchesTag;
  });

  const handleAddTag = (id: string) => {
    if (tagInput.trim()) {
      addTagToHistory(id, tagInput.trim());
      setTagInput('');
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <h2 className="text-lg font-medium text-gray-900 flex items-center">
          <Clock className="h-5 w-5 mr-2 text-gray-500" />
          Query History
        </h2>
        <div className="mt-3 flex flex-col sm:flex-row gap-2">
          <div className="relative flex-grow">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search queries..."
              className="form-input block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            className={`px-3 py-1 rounded-md text-sm flex items-center ${
              showFavoritesOnly ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-700'
            }`}
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
          >
            <Star className={`h-4 w-4 mr-1 ${showFavoritesOnly ? 'text-amber-500 fill-amber-500' : 'text-gray-400'}`} />
            Favorites
          </button>
          <div className="relative">
            <button
              className={`px-3 py-1 rounded-md text-sm flex items-center ${
                filterTag ? 'bg-primary-100 text-primary-800' : 'bg-gray-100 text-gray-700'
              }`}
              onClick={() => filterTag ? setFilterTag(null) : null}
            >
              <Filter className="h-4 w-4 mr-1 text-gray-400" />
              {filterTag || 'Filter by Tag'}
              {filterTag && <X className="h-3 w-3 ml-1" onClick={() => setFilterTag(null)} />}
            </button>
            {!filterTag && (
              <div className="absolute z-10 right-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg">
                {allTags.length > 0 ? (
                  <div className="py-1 max-h-36 overflow-y-auto">
                    {allTags.map(tag => (
                      <button
                        key={tag}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setFilterTag(tag)}
                      >
                        <span className="flex items-center">
                          <Tag className="h-3 w-3 mr-2" />
                          {tag}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="py-2 px-4 text-sm text-gray-500">No tags yet</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {filteredItems.length > 0 ? (
        <ul className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
          {filteredItems.map((item) => (
            <li key={item.id} className="p-4 hover:bg-gray-50">
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 break-words">
                    {item.query}
                  </p>
                  <div className="mt-1 flex items-center text-xs text-gray-500">
                    <Calendar className="flex-shrink-0 mr-1.5 h-3 w-3" />
                    <span>{formatDate(item.timestamp)}</span>

                    {item.tags.length > 0 && (
                      <div className="ml-2 flex flex-wrap gap-1">
                        {item.tags.map(tag => (
                          <span
                            key={tag}
                            className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 text-xs font-medium text-gray-800"
                          >
                            <Tag className="mr-1 h-2 w-2" />
                            {tag}
                            <button
                              className="ml-1 text-gray-400 hover:text-gray-600"
                              onClick={() => removeTagFromHistory(item.id, tag)}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="ml-4 flex-shrink-0 flex items-center space-x-2">
                  <button
                    onClick={() => toggleFavorite(item.id)}
                    className="text-gray-400 hover:text-amber-500"
                  >
                    <Star className={`h-5 w-5 ${item.favorite ? 'text-amber-500 fill-amber-500' : ''}`} />
                  </button>
                  <button
                    onClick={() => setEditingTagsFor(editingTagsFor === item.id ? null : item.id)}
                    className="text-gray-400 hover:text-primary-500"
                  >
                    <Tag className="h-5 w-5" />
                  </button>
                  <button className="text-gray-400 hover:text-primary-500">
                    <BookOpen className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {editingTagsFor === item.id && (
                <div className="mt-2 flex">
                  <input
                    type="text"
                    placeholder="Add tag..."
                    className="flex-1 form-input block sm:text-sm border-gray-300 rounded-md rounded-r-none"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddTag(item.id)}
                  />
                  <button
                    className="px-3 py-2 border border-l-0 border-gray-300 bg-gray-50 text-sm rounded-r-md"
                    onClick={() => handleAddTag(item.id)}
                  >
                    Add
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <div className="py-12 text-center">
          <div className="mx-auto h-12 w-12 text-gray-400">
            <Clock className="h-12 w-12" />
          </div>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No query history</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || showFavoritesOnly || filterTag
              ? 'No results match your filters'
              : 'Your query history will appear here'}
          </p>
        </div>
      )}
    </div>
  );
};

export default QueryHistory;
