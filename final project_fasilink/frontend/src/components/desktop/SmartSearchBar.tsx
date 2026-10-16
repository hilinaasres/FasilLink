import React, { FormEvent, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { MapPin, Search } from 'lucide-react';
import api from '../../services/api';

type SuggestionType = 'title' | 'location' | 'category';

interface SearchSuggestion {
  suggestion: string;
  type: SuggestionType;
  count?: number;
}

interface CategoryOption {
  id: string;
  name: string;
}

interface LocationOption {
  name: string;
  count: number;
}

interface SmartSearchBarProps {
  transactionType?: 'all' | 'rent' | 'sell';
  onTransactionTypeChange?: (type: 'all' | 'rent' | 'sell') => void;
  onSearchSubmitted?: () => void;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readText = (...values: unknown[]): string => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
};

const canonicalCategory = (text: string): string | undefined => {
  const normalized = text.toLowerCase();
  if (/\b(homes?|houses?|apartments?|properties?)\b/.test(normalized)) return 'Homes';
  if (/\b(vehicles?|cars?|toyota|trucks?|vans?)\b/.test(normalized)) return 'Vehicles';
  if (/\b(lands?|plots?|lots?)\b/.test(normalized)) return 'Land';
  if (/\b(events?|event materials?|tents?|chairs?)\b/.test(normalized)) return 'Event Materials';
  return undefined;
};

const matchCategoryOption = (value: string, options: CategoryOption[]): CategoryOption | undefined => {
  const exact = options.find((option) => option.name.toLowerCase() === value.toLowerCase());
  if (exact) return exact;
  const canonical = canonicalCategory(value);
  return canonical
    ? options.find((option) => canonicalCategory(option.name) === canonical)
    : undefined;
};

const parseAmount = (raw: string): number | undefined => {
  const amount = Number(raw.replace(/,/g, ''));
  return Number.isFinite(amount) ? amount : undefined;
};

const parseSearchPhrase = (
  rawQuery: string,
  knownCategories: CategoryOption[],
  selectedCategory: string,
  selectedLocation: string,
  selectedType: string,
) => {
  let query = rawQuery.trim();
  let category = selectedCategory;
  let location = selectedLocation;
  let type = selectedType;
  let minimum: string | undefined;
  let maximum: string | undefined;

  const selectedCategoryOption = matchCategoryOption(category, knownCategories);
  if (selectedCategoryOption) category = selectedCategoryOption.name;

  const intent = query.match(/\b(for\s+)?(rent|rental|lease|sell|sale|selling|buy|purchase)\b/i);
  if (intent) {
    type = /rent|rental|lease/i.test(intent[2]) ? 'rent' : 'sell';
    query = query.replace(intent[0], ' ');
  }

  const categoryName = canonicalCategory(query);
  if (categoryName) {
    const apiCategory = matchCategoryOption(categoryName, knownCategories);
    if (apiCategory) {
      category = apiCategory.name;
      const categoryWords = /\b(homes?|houses?|apartments?|properties?|vehicles?|cars?|trucks?|vans?|lands?|plots?|lots?|event\s+materials?|events?)\b/i;
      query = query.replace(categoryWords, ' ');
    }
  }

  const range = query.match(/\b(?:between|from)\s+([\d,]+(?:\.\d+)?)\s*(k|m|million|thousand)?\s+(?:and|to|-)\s+([\d,]+(?:\.\d+)?)\s*(k|m|million|thousand)?\b/i);
  if (range) {
    const multiplier = (unit: string | undefined) => {
      if (!unit) return 1;
      if (/^(k|thousand)$/i.test(unit)) return 1_000;
      return 1_000_000;
    };
    const firstAmount = parseAmount(range[1]);
    const secondAmount = parseAmount(range[3]);
    if (firstAmount !== undefined && secondAmount !== undefined) {
      const first = firstAmount * multiplier(range[2]);
      const second = secondAmount * multiplier(range[4]);
      minimum = String(Math.min(first, second));
      maximum = String(Math.max(first, second));
      query = query.replace(range[0], ' ');
    }
  } else {
    const bound = query.match(/\b(under|below|less than|upto|up to|over|above|more than|at least)\s*(?:etb|birr)?\s*([\d,]+(?:\.\d+)?)\s*(k|m|million|thousand)?\b/i);
    if (bound) {
      const amount = parseAmount(bound[2]);
      if (amount !== undefined) {
        const value = amount * (/^(k|thousand)$/i.test(bound[3] || '') ? 1_000 : /^(m|million)$/i.test(bound[3] || '') ? 1_000_000 : 1);
        if (/under|below|less than|upto|up to/i.test(bound[1])) maximum = String(value);
        else minimum = String(value);
        query = query.replace(bound[0], ' ');
      }
    }
  }

  const locationMatch = query.match(/\b(?:in|at|near|around)\s+([A-Za-z0-9][A-Za-z0-9 .'-]*)$/i);
  if (locationMatch) {
    const mentioned = locationMatch[1].trim().replace(/[.,]+$/, '');
    location = mentioned || location;
    query = query.slice(0, locationMatch.index).trim();
  }

  return {
    query: query.replace(/\s+/g, ' ').trim(),
    category,
    location,
    type,
    minimum,
    maximum,
  };
};

const SmartSearchBar: React.FC<SmartSearchBarProps> = ({
  transactionType: transactionTypeProp = 'all',
  onTransactionTypeChange,
  onSearchSubmitted,
}) => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [place, setPlace] = useState(searchParams.get('location') || '');
  const [transactionType, setTransactionType] = useState<'all' | 'rent' | 'sell'>(
    (searchParams.get('type') as 'all' | 'rent' | 'sell' | null) || transactionTypeProp,
  );
  const [focused, setFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionError, setSuggestionError] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [optionsLoaded, setOptionsLoaded] = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [optionsError, setOptionsError] = useState('');
  const optionsRequested = useRef(false);
  const requestId = useRef(0);
  const idPrefix = useId().replace(/:/g, '');
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setQuery(searchParams.get('q') || '');
    setCategory(searchParams.get('category') || '');
    setPlace(searchParams.get('location') || '');
    setTransactionType(
      (searchParams.get('type') as 'all' | 'rent' | 'sell' | null) || transactionTypeProp,
    );
  }, [location.pathname, location.search, searchParams, transactionTypeProp]);

  useEffect(() => {
    if (!focused || optionsLoaded || optionsRequested.current) return;
    optionsRequested.current = true;
    let active = true;
    setOptionsLoading(true);
    setOptionsError('');

    const loadCategories = api.get('/discover/categories')
      .then((response) => ({ succeeded: true as const, data: response.data }))
      .catch((error: unknown) => ({ succeeded: false as const, error }));
    const loadLocations = api.get('/discover/locations')
      .then((response) => ({ succeeded: true as const, data: response.data }))
      .catch((error: unknown) => ({ succeeded: false as const, error }));

    Promise.all([loadCategories, loadLocations]).then(([categoryResult, locationResult]) => {
      if (!active) return;
      const errors: string[] = [];
      if (categoryResult.succeeded) {
        const categoryData: unknown = categoryResult.data;
        if (!isRecord(categoryData) || !Array.isArray(categoryData.categories)) {
          console.error('Search categories response did not contain a categories array.');
          errors.push('Categories are unavailable.');
        } else {
          setCategories(categoryData.categories.flatMap((value: unknown) => {
            if (!isRecord(value)) return [];
            const name = readText(value.name);
            return name ? [{ id: String(value.id ?? name), name }] : [];
          }));
        }
      } else {
        console.error('Failed to load search categories:', categoryResult.error);
        errors.push('Categories are unavailable.');
      }

      if (locationResult.succeeded) {
        const locationData: unknown = locationResult.data;
        if (!isRecord(locationData) || !Array.isArray(locationData.locations)) {
          console.error('Search locations response did not contain a locations array.');
          errors.push('Locations are unavailable.');
        } else {
          setLocations(locationData.locations.flatMap((value: unknown) => {
            if (typeof value === 'string' && value.trim()) return [{ name: value.trim(), count: 0 }];
            if (!isRecord(value)) return [];
            const name = readText(value.location);
            return name ? [{ name, count: Number(value.listing_count) || 0 }] : [];
          }));
        }
      } else {
        console.error('Failed to load search locations:', locationResult.error);
        errors.push('Locations are unavailable.');
      }

      setOptionsError(errors.join(' '));
      setOptionsLoaded(errors.length === 0);
      if (errors.length > 0) optionsRequested.current = false;
    }).finally(() => {
      if (active) setOptionsLoading(false);
    });

    return () => {
      active = false;
      optionsRequested.current = false;
    };
  }, [focused, optionsLoaded]);

  useEffect(() => {
    const currentRequest = ++requestId.current;
    if (!focused || query.trim().length < 2) {
      setSuggestions([]);
      setSuggestionsLoading(false);
      setSuggestionError('');
      return undefined;
    }

    const controller = new AbortController();
    setSuggestionsLoading(true);
    setSuggestionError('');
    const timeout = window.setTimeout(() => {
      api.get('/items/suggestions', {
        params: { q: query.trim(), limit: 8 },
        signal: controller.signal,
      }).then((response) => {
        if (currentRequest !== requestId.current) return;
        const data: unknown = response.data;
        const rows = isRecord(data) && Array.isArray(data.suggestions) ? data.suggestions : [];
        setSuggestions(rows.flatMap((value: unknown) => {
          if (!isRecord(value)) return [];
          const text = readText(value.suggestion);
          const type = readText(value.type);
          if (!text || !['title', 'location', 'category'].includes(type)) return [];
          return [{ suggestion: text, type: type as SuggestionType, count: Number(value.count) || 0 }];
        }));
      }).catch((error: unknown) => {
        if (controller.signal.aborted || currentRequest !== requestId.current) return;
        console.error('Failed to load search suggestions:', error);
        setSuggestions([]);
        setSuggestionError('Suggestions could not be loaded.');
      }).finally(() => {
        if (currentRequest === requestId.current) setSuggestionsLoading(false);
      });
    }, 300);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [focused, query]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setFocused(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const categoryOptions = useMemo(() => categories, [categories]);
  const selectedCategoryValue = matchCategoryOption(category, categoryOptions)?.name || category;

  const activeOptions = query.trim().length >= 2 ? suggestions : [];
  const showPanel = focused && (
    query.trim().length >= 2 || optionsLoading || optionsLoaded || Boolean(optionsError)
  );

  const submitSearch = (event?: FormEvent<HTMLFormElement>, suggestion?: SearchSuggestion) => {
    event?.preventDefault();
    const rawQuery = suggestion?.type === 'title' ? suggestion.suggestion : query;
    const selectedCategory = suggestion?.type === 'category' ? suggestion.suggestion : category;
    const selectedLocation = suggestion?.type === 'location' ? suggestion.suggestion : place;
    const parsed = parseSearchPhrase(
      rawQuery,
      categoryOptions,
      selectedCategory,
      selectedLocation,
      transactionType,
    );
    const next = new URLSearchParams(searchParams);
    const setOrDelete = (key: string, value: string | undefined) => {
      if (value) next.set(key, value);
      else next.delete(key);
    };

    setOrDelete('q', parsed.query);
    setOrDelete('category', parsed.category);
    setOrDelete('location', parsed.location);
    setOrDelete('type', parsed.type === 'all' ? undefined : parsed.type);
    if (parsed.minimum !== undefined) next.set('min', parsed.minimum);
    if (parsed.maximum !== undefined) next.set('max', parsed.maximum);
    next.set('page', '1');
    setFocused(false);
    setSelectedIndex(-1);
    onSearchSubmitted?.();
    navigate(`/search?${next.toString()}`);
  };

  const selectSuggestion = (suggestion: SearchSuggestion) => {
    if (suggestion.type === 'category') setCategory(suggestion.suggestion);
    if (suggestion.type === 'location') setPlace(suggestion.suggestion);
    if (suggestion.type === 'title') setQuery(suggestion.suggestion);
    submitSearch(undefined, suggestion);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setFocused(false);
      setSelectedIndex(-1);
      return;
    }
    if (event.key === 'ArrowDown' && activeOptions.length > 0) {
      event.preventDefault();
      setSelectedIndex((current) => Math.min(current + 1, activeOptions.length - 1));
      return;
    }
    if (event.key === 'ArrowUp' && activeOptions.length > 0) {
      event.preventDefault();
      setSelectedIndex((current) => Math.max(current - 1, -1));
      return;
    }
    if (event.key === 'Enter' && selectedIndex >= 0 && activeOptions[selectedIndex]) {
      event.preventDefault();
      selectSuggestion(activeOptions[selectedIndex]);
    }
  };

  return (
    <div ref={rootRef} className="relative w-full min-w-0">
      <form
        onSubmit={(event) => submitSearch(event)}
        className="grid min-h-11 grid-cols-[minmax(0,1fr)_44px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm focus-within:border-violet-300 focus-within:ring-2 focus-within:ring-violet-200 sm:grid-cols-[minmax(0,1fr)_minmax(105px,0.7fr)_minmax(102px,0.65fr)_minmax(110px,0.7fr)_44px]"
        role="search"
        aria-label="Search marketplace"
      >
        <label className="sr-only" htmlFor={`navbar-keyword-search-${idPrefix}`}>Search listings</label>
        <input
          ref={inputRef}
          id={`navbar-keyword-search-${idPrefix}`}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setSelectedIndex(-1);
          }}
          onFocus={() => setFocused(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search homes, cars, land, events..."
          autoComplete="off"
          aria-autocomplete="list"
          aria-controls={`navbar-search-suggestions-${idPrefix}`}
          aria-expanded={showPanel && query.trim().length >= 2}
          aria-activedescendant={selectedIndex >= 0 ? `navbar-search-option-${idPrefix}-${selectedIndex}` : undefined}
          className="min-w-0 border-0 bg-transparent px-3 text-sm text-slate-900 outline-none placeholder:text-slate-500"
        />
        <label className="sr-only" htmlFor={`navbar-category-search-${idPrefix}`}>Category</label>
        <select
          id={`navbar-category-search-${idPrefix}`}
          value={selectedCategoryValue}
          onChange={(event) => setCategory(event.target.value)}
          onFocus={() => setFocused(true)}
          className="col-span-2 min-h-10 min-w-0 border-t border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 outline-none focus-visible:bg-violet-50 sm:col-span-1 sm:min-h-0 sm:border-l sm:border-t-0"
        >
          <option value="">All categories</option>
          {category && !matchCategoryOption(category, categoryOptions) && (
            <option value={category}>{canonicalCategory(category) || category}</option>
          )}
          {categoryOptions.map((option) => <option key={option.id} value={option.name}>{option.name}</option>)}
        </select>
        <label className="sr-only" htmlFor={`navbar-location-search-${idPrefix}`}>Location</label>
        <input
          id={`navbar-location-search-${idPrefix}`}
          type="text"
          list={`navbar-location-options-${idPrefix}`}
          value={place}
          onChange={(event) => setPlace(event.target.value)}
          onFocus={() => setFocused(true)}
          placeholder="Any location"
          autoComplete="off"
          className="col-span-2 min-h-10 min-w-0 border-t border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 outline-none placeholder:text-slate-500 focus-visible:bg-violet-50 sm:col-span-1 sm:min-h-0 sm:border-l sm:border-t-0"
        />
        <datalist id={`navbar-location-options-${idPrefix}`}>
          {locations.map((option) => (
            <option key={option.name} value={option.name} />
          ))}
        </datalist>
        <label className="sr-only" htmlFor={`navbar-type-search-${idPrefix}`}>Rent or sell</label>
        <select
          id={`navbar-type-search-${idPrefix}`}
          value={transactionType}
          onChange={(event) => {
            const type = event.target.value as 'all' | 'rent' | 'sell';
            setTransactionType(type);
            onTransactionTypeChange?.(type);
          }}
          onFocus={() => setFocused(true)}
          className="col-span-2 min-h-10 min-w-0 border-t border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 outline-none focus-visible:bg-violet-50 sm:col-span-1 sm:min-h-0 sm:border-l sm:border-t-0"
        >
          <option value="all">Rent or sell</option>
          <option value="rent">Rent</option>
          <option value="sell">Sell</option>
        </select>
        <button
          type="submit"
          aria-label="Search listings"
          className="flex min-h-11 items-center justify-center bg-[#6C3BFF] text-white transition hover:bg-[#582FE0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white"
        >
          <Search aria-hidden="true" className="h-5 w-5" />
        </button>
      </form>

      {showPanel && (
        <div
          id={`navbar-search-suggestions-${idPrefix}`}
          role="listbox"
          aria-label="Search suggestions"
          className="absolute left-0 right-0 top-full z-[60] mt-2 max-h-[min(70vh,420px)] overflow-y-auto rounded-xl border border-slate-200 bg-white py-2 shadow-xl"
        >
          {query.trim().length >= 2 ? (
            <>
              {suggestionsLoading && <p className="px-4 py-3 text-sm text-slate-500">Searching suggestions…</p>}
              {!suggestionsLoading && suggestionError && <p role="status" className="px-4 py-3 text-sm text-rose-700">{suggestionError}</p>}
              {!suggestionsLoading && !suggestionError && activeOptions.length === 0 && (
                <p role="status" className="px-4 py-3 text-sm text-slate-600">No matching suggestions. Press Enter to search all listings.</p>
              )}
              {activeOptions.map((suggestion, index) => (
                <button
                  key={`${suggestion.type}-${suggestion.suggestion}`}
                  id={`navbar-search-option-${idPrefix}-${index}`}
                  type="button"
                  role="option"
                  aria-selected={selectedIndex === index}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectSuggestion(suggestion)}
                  className={`flex min-h-12 w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#6C3BFF] ${selectedIndex === index ? 'bg-[#F2EEFF]' : 'hover:bg-slate-50'}`}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    {suggestion.type === 'location' && <MapPin aria-hidden="true" className="h-4 w-4 shrink-0 text-[#6C3BFF]" />}
                    <span className="truncate font-medium text-slate-900">{suggestion.suggestion}</span>
                  </span>
                  <span className="shrink-0 text-xs capitalize text-slate-500">{suggestion.type}</span>
                </button>
              ))}
            </>
          ) : optionsLoading ? (
            <p role="status" className="px-4 py-3 text-sm text-slate-500">Loading categories and locations…</p>
          ) : optionsError ? (
            <p role="status" className="px-4 py-3 text-sm text-rose-700">{optionsError}</p>
          ) : (
            <div className="grid gap-3 p-4 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Categories</p>
                <div className="flex flex-wrap gap-2">
                  {categoryOptions.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        setCategory(option.name);
                        navigate(`/search?${new URLSearchParams({ category: option.name }).toString()}`);
                        setFocused(false);
                      }}
                      className="min-h-10 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:border-violet-300 hover:bg-[#F2EEFF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6C3BFF]"
                    >
                      {option.name}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Popular locations</p>
                <div className="flex flex-wrap gap-2">
                  {locations.slice(0, 6).map((option) => (
                    <button
                      key={option.name}
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        setPlace(option.name);
                        navigate(`/search?${new URLSearchParams({ location: option.name }).toString()}`);
                        setFocused(false);
                      }}
                      className="min-h-10 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:border-violet-300 hover:bg-[#F2EEFF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6C3BFF]"
                    >
                      {option.name}{option.count > 0 ? ` (${option.count})` : ''}
                    </button>
                  ))}
                  {locations.length === 0 && <p className="text-sm text-slate-500">No active listing locations found.</p>}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SmartSearchBar;
