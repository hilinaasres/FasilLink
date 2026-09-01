import React, { useState, useEffect } from 'react';
import { Search, Zap, MapPin, DollarSign } from 'lucide-react';

interface SearchSuggestion {
  id: string;
  text: string;
  icon: React.ReactNode;
  category?: string;
}

interface AISearchBarProps {
  onSearch?: (query: string) => void;
  onSuggestionSelect?: (suggestion: string) => void;
  placeholder?: string;
  className?: string;
}

const defaultSuggestions: SearchSuggestion[] = [
  { id: '1', text: 'Rent car under 5000', icon: <Zap className="w-4 h-4" />, category: 'Vehicles' },
  { id: '2', text: '2 bedroom home', icon: <MapPin className="w-4 h-4" />, category: 'Homes' },
  { id: '3', text: 'Wedding event chairs', icon: <DollarSign className="w-4 h-4" />, category: 'Event Materials' },
  { id: '4', text: 'Premium rentals', icon: <Zap className="w-4 h-4" /> },
  { id: '5', text: 'Popular listings', icon: <MapPin className="w-4 h-4" /> },
];

const AISearchBar: React.FC<AISearchBarProps> = ({
  onSearch,
  onSuggestionSelect,
  placeholder = 'Search homes, vehicles, event materials...',
  className = '',
}) => {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);

  useEffect(() => {
    if (isFocused && !query) {
      setSuggestions(defaultSuggestions);
    } else if (query.length > 0) {
      // Filter suggestions based on query
      const filtered = defaultSuggestions.filter(s =>
        s.text.toLowerCase().includes(query.toLowerCase())
      );
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  }, [query, isFocused]);

  const handleSearch = (searchQuery: string) => {
    const nextQuery = searchQuery.trim();
    setQuery(nextQuery);
    if (nextQuery) {
      onSearch?.(nextQuery);
    }
    setSuggestions([]);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    onSuggestionSelect?.(suggestion);
    setSuggestions([]);
  };

  return (
    <div className={`relative ${className}`}>
      <div className="desktop-search-shell">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSearch(query);
            }
          }}
          placeholder={placeholder}
          className="desktop-search-input"
        />
        <button
          type="button"
          className="desktop-search-button"
          onClick={() => handleSearch(query)}
          aria-label="Search listings"
        >
          <Search className="desktop-search-button-icon" />
        </button>
      </div>

      {/* Suggestions Dropdown */}
      {isFocused && suggestions.length > 0 && (
        <div className="desktop-search-dropdown">
          <div className="desktop-search-dropdown-inner">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion.id}
                onClick={() => handleSuggestionClick(suggestion.text)}
                className="desktop-search-suggestion"
                type="button"
              >
                <span className="desktop-search-suggestion-icon">{suggestion.icon}</span>
                <div className="desktop-search-suggestion-content">
                  <p className="desktop-search-suggestion-text">{suggestion.text}</p>
                  {suggestion.category && (
                    <p className="desktop-search-suggestion-category">{suggestion.category}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AISearchBar;
