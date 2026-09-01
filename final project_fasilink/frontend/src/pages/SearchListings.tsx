import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import './SearchListings.css';
import FavoriteButton from '../components/favorites/FavoriteButton';

const AI_API = process.env.REACT_APP_AI_BASE_URL || 'http://localhost:5001/api';

const Stars: React.FC<{ avg?: number; count?: number }> = ({ avg, count }) => {
  const a = Number(avg || 0);
  const filled = Math.round(a);
  const stars = Array.from({ length: 5 }, (_, i) => (i < filled ? '⭐' : '☆')).join('');
  return (
    <span title={count ? `${a.toFixed(1)} (${count})` : 'No ratings yet'} className="stars">
      {stars}{count ? ` (${count})` : ''}
    </span>
  );
};

const SearchListings: React.FC = () => {
  const locationObj = useLocation();
  const queryParams = useMemo(() => new URLSearchParams(locationObj.search), [locationObj.search]);
  const { user } = useAuth();

  const [searchTerm, setSearchTerm] = useState(queryParams.get('q') || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [aiResults, setAiResults] = useState<any[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [useAI, setUseAI] = useState(false);

  const readStoredIds = (key: string) => {
    try {
      const raw = localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.map((value) => String(value)) : [];
    } catch {
      return [];
    }
  };

  const contextSignals = () => ({
    favorite_ids: readStoredIds('favorites'),
    clicked_ids: readStoredIds('clickedItems'),
  });

  const trackItemClick = (itemId: string) => {
    try {
      const clickedItems = readStoredIds('clickedItems');
      const next = [itemId, ...clickedItems.filter((value) => value !== itemId)].slice(0, 50);
      localStorage.setItem('clickedItems', JSON.stringify(next));
    } catch {
      // Ignore localStorage errors.
    }
  };

  const fetchAIResults = async (query: string) => {
    if (!query || query.length < 2) return;

    setAiLoading(true);
    try {
      const wantsPopular = /trend|popular|top|best|most viewed/i.test(query);
      const endpoint = wantsPopular ? `${AI_API}/popular?limit=10` : `${AI_API}/recommend`;

      const response = wantsPopular
        ? await fetch(endpoint)
        : await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query,
              user_id: user?.id,
              ...contextSignals(),
              limit: 10,
            }),
          });

      const data = await response.json();
      const resultsFromAI = data.items || data.trending || data.recommendations || data.results || [];
      setAiResults(resultsFromAI);
      setUseAI(resultsFromAI.length > 0);
    } catch (e) {
      setAiResults([]);
      setUseAI(false);
    } finally {
      setAiLoading(false);
    }
  };

  const fetchSuggestions = async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      const res = await api.get('/items/suggestions', {
        params: { q: query, limit: 8 }
      });
      setSuggestions(res.data.suggestions || []);
      setShowSuggestions(true);
    } catch (e) {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    setSelectedSuggestionIndex(-1);
    fetchSuggestions(value);
    if (value.length >= 2) fetchAIResults(value);
  };

  const handleSearchInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedSuggestionIndex(prev =>
        prev < suggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSuggestionIndex(prev => prev > -1 ? prev - 1 : -1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedSuggestionIndex >= 0) {
        const selected = suggestions[selectedSuggestionIndex];
        setSearchTerm(selected.suggestion);
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
        fetchResults(selected.suggestion);
        fetchAIResults(selected.suggestion);
      } else {
        fetchResults();
        fetchAIResults(searchTerm);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
    }
  };

  const handleSuggestionClick = (suggestion: any) => {
    setSearchTerm(suggestion.suggestion);
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    fetchResults(suggestion.suggestion);
    fetchAIResults(suggestion.suggestion);
  };

  const fetchResults = async (overrideQ?: string) => {
    setLoading(true);
    setError('');
    setShowSuggestions(false);

    const activeQ = typeof overrideQ === 'string' ? overrideQ : searchTerm;

    try {
      const res = await api.get('/items', {
        params: {
          q: activeQ || undefined,
          limit: 30,
        }
      });
      setResults(res.data.items || []);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to load listings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const newQ = queryParams.get('q') || '';
    setSearchTerm(newQ);
    fetchResults(newQ);
    if (newQ) fetchAIResults(newQ);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationObj.search]);

  const displayResults = useMemo(() => {
    if (useAI && aiResults.length > 0) {
      const mappedAI = aiResults.map((result) => ({
        id: result.id,
        title: result.title,
        location: result.location,
        price: result.price,
        category: result.category,
        image_url: result.image_url || result.image,
        avg_rating: Number(result.avg_rating ?? result.rating ?? 0),
        rating_count: Number(result.rating_count ?? 0),
        transaction_type: 'rent',
        score: result.score,
        from_ai: true,
      }));
      const aiIds = new Set(mappedAI.map((result) => String(result.id)));
      const regularOnly = results.filter((result) => !aiIds.has(String(result.id)));
      return [...mappedAI, ...regularOnly];
    }

    return results;
  }, [useAI, aiResults, results]);

  return (
    <div className="search-page">
      <div className="search-sidebar">
        <h3>Search</h3>

        <div className="search-group">
          <label htmlFor="search-input">Search Keyword</label>
          <div className="search-input-container">
            <input
              id="search-input"
              type="text"
              placeholder="e.g. house, car..."
              value={searchTerm}
              onChange={handleSearchInputChange}
              onKeyDown={handleSearchInputKeyDown}
              onFocus={() => searchTerm.length >= 2 && setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            />
            {showSuggestions && suggestions.length > 0 && (
              <div className="suggestions-dropdown">
                {suggestions.map((suggestion, index) => (
                  <div
                    key={`${suggestion.type}-${suggestion.suggestion}`}
                    className={`suggestion-item ${index === selectedSuggestionIndex ? 'selected' : ''}`}
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    <span className="suggestion-text">{suggestion.suggestion}</span>
                    <span className="suggestion-type">{suggestion.type}</span>
                    <span className="suggestion-count">({suggestion.count})</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <button className="btn-primary search-button" onClick={() => fetchResults()} disabled={loading}>
          {loading ? 'Loading...' : 'Search'}
        </button>
        {useAI && aiResults.length > 0 && (
          <div className="ai-results-banner">
            ✨ AI found {aiResults.length} smart matches
          </div>
        )}
      </div>

      <div className="search-results">
        <h2>Results</h2>
        {error && <div className="error-message">{error}</div>}
        {!error && (loading || aiLoading) && <div>Loading listings...</div>}
        <div className="results-grid">
          {displayResults.map(item => (
            <div key={item.id} className="result-card">
              {item.from_ai && (
                <div className="ai-match-badge">
                  ✨ AI Match
                </div>
              )}
               <div className="img-placeholder relative">
                 {item.image_url ? (
                   <img
                     src={item.image_url}
                     alt={item.title}
                     className="result-image"
                     onError={(e) => { const target = e.currentTarget as HTMLImageElement; target.src = 'https://picsum.photos/800/600?random=999'; target.onerror = null; }}
                   />
                 ) : (
                   <div className="no-image-placeholder">Image</div>
                 )}
                 <div className="favorite-overlay">
                   <FavoriteButton
                     item={{
                       id: String(item.id),
                       title: item.title,
                       price: Number(item.price),
                       location: item.location,
                       image_url: item.image_url,
                       category: item.category,
                       transaction_type: item.transaction_type,
                     }}
                   />
                 </div>
               </div>
              <div className="result-info">
                <div className="result-header">
                  <h3>{item.title}</h3>
                </div>
                <p className="location">📍 {item.location}</p>
                <p className="price">{Number(item.price).toLocaleString()} ETB</p>
                <div className="rating-row">
                  <Stars avg={Number(item.avg_rating)} count={Number(item.rating_count)} />
                </div>
                <div className="result-tags">
                  <span className="tag">{item.category || 'Category'}</span>
                  <span className="tag">{item.transaction_type}</span>
                </div>
                <Link to={`/item/${item.id}`} className="btn-secondary view-details-link" onClick={() => trackItemClick(String(item.id))}>View Details</Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SearchListings;
