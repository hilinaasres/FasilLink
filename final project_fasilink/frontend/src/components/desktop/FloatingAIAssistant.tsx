import React, { useEffect, useRef, useState } from 'react';
import { MessageCircle, Maximize2, Minimize2, Send, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import './FloatingAIAssistant.css';

const BACKEND_API = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  items?: Item[];
}

interface Item {
  id: number;
  title: string;
  location: string;
  subcity?: string;
  price: number | null;
  transaction_type: string;
  category: string;
  image_url: string;
  description?: string;
  featured: boolean;
  premium: boolean;
  avg_rating?: number;
  rating_count?: number;
  metadata?: Record<string, any>;
}

// ── Parse user message into filters ─────────────────────────────────────────
function parseFilters(text: string): {
  category?: string;
  location?: string;
  transaction_type?: string;
  max_price?: number;
  min_price?: number;
  keywords: string[];
} {
  const t = text.toLowerCase()
    .replace(/birr|etb|ብር/gi, '')
    .replace(/(\d+\.?\d*)\s*k\b/gi, (_, n) => String(parseFloat(n) * 1000))
    .replace(/(\d+\.?\d*)\s*million/gi, (_, n) => String(parseFloat(n) * 1000000))
    .trim();

  const filters: ReturnType<typeof parseFilters> = { keywords: [] };

  if (/(house|home|apart|villa|room|condo|studio|ቤት|አፓርት)/.test(t)) filters.category = 'Homes';
  else if (/(car|vehicle|toyota|honda|hyundai|truck|bus|auto|መኪና)/.test(t)) filters.category = 'Vehicles';
  else if (/(event|decor|party|wedding|hall|tent|chair|table|sound|light|ዝግጅት)/.test(t)) filters.category = 'Event Materials';
  else if (/(land|plot|ቦታ|ground)/.test(t)) filters.category = 'Land';

  if (/(for sale|to buy|sell|selling|\bsale\b)/.test(t)) filters.transaction_type = 'sell';
  else if (/(for rent|to rent|rental|renting|\brent\b|per month|monthly)/.test(t)) filters.transaction_type = 'rent';

  const locations: Record<string, string> = {
    azezo: 'Azezo', maraki: 'Maraki', fasil: 'Fasil', arada: 'Arada',
    piassa: 'Piassa', piyassa: 'Piassa', teda: 'Teda', gondar: 'Gondar',
    autobus: 'Autobus', menaharia: 'Menaharia', mentber: 'Mentber',
  };
  for (const [key, val] of Object.entries(locations)) {
    if (t.includes(key)) { filters.location = val; break; }
  }

  const under = t.match(/(?:under|below|max|less than|cheap|affordable|budget)\s*([\d,]+)/);
  if (under) filters.max_price = parseFloat(under[1].replace(/,/g, ''));

  const above = t.match(/(?:above|over|min|more than|at least|luxury|expensive)\s*([\d,]+)/);
  if (above) filters.min_price = parseFloat(above[1].replace(/,/g, ''));

  const around = t.match(/(?:around|about|approximately)\s*([\d,]+)/);
  if (around) {
    const val = parseFloat(around[1].replace(/,/g, ''));
    filters.min_price = val * 0.7;
    filters.max_price = val * 1.3;
  }

  if (!filters.max_price && !filters.min_price) {
    const bare = t.match(/\b([\d,]{3,})\b/);
    if (bare) filters.max_price = parseFloat(bare[1].replace(/,/g, ''));
  }

  if (!filters.max_price && /(cheap|affordable|budget|low price|inexpensive)/.test(t)) filters.max_price = 5000;
  if (!filters.min_price && /(luxury|expensive|high end|premium)/.test(t)) filters.min_price = 50000;

  const keywordPatterns = [
    'wifi', 'furnished', 'unfurnished', 'parking', 'balcony', 'security',
    'kitchen', 'water', 'electricity', 'indoor', 'outdoor', 'new', 'used',
    'bedroom', 'bathroom', 'floor', 'garage', 'garden', 'pool',
  ];
  filters.keywords = keywordPatterns.filter(k => t.includes(k));

  return filters;
}

// ── Fetch + filter + rank items ──────────────────────────────────────────────
async function fetchAndRank(filters: ReturnType<typeof parseFilters>): Promise<Item[]> {
  try {
    const params = new URLSearchParams();
    if (filters.category) params.append('category', filters.category);
    params.append('limit', '100');

    const res = await fetch(`${BACKEND_API}/items?${params}`);
    if (!res.ok) return [];
    const data = await res.json();
    let items: Item[] = data.items || [];

    if (filters.location) {
      const loc = filters.location.toLowerCase();
      items = items.filter(i =>
        i.location?.toLowerCase().includes(loc) ||
        i.subcity?.toLowerCase().includes(loc)
      );
    }

    if (filters.transaction_type) {
      items = items.filter(i => i.transaction_type?.toLowerCase() === filters.transaction_type);
    }

    if (filters.max_price != null) {
      items = items.filter(i => i.price != null && i.price <= filters.max_price!);
    }
    if (filters.min_price != null) {
      items = items.filter(i => i.price != null && i.price >= filters.min_price!);
    }

    if (filters.keywords.length > 0) {
      const matched = items.filter(i => {
        const searchable = [i.title, i.description, JSON.stringify(i.metadata || {})].join(' ').toLowerCase();
        return filters.keywords.some(k => searchable.includes(k));
      });
      if (matched.length > 0) items = matched;
    }

    items.sort((a, b) => {
      const scoreA = (a.premium ? 100 : 0) + (a.featured ? 50 : 0) + (a.avg_rating || 0) * 10 + (a.rating_count || 0);
      const scoreB = (b.premium ? 100 : 0) + (b.featured ? 50 : 0) + (b.avg_rating || 0) * 10 + (b.rating_count || 0);
      return scoreB - scoreA;
    });

    return items.slice(0, 5);
  } catch {
    return [];
  }
}

async function fetchTrending(): Promise<Item[]> {
  try {
    const res = await fetch(`${BACKEND_API}/items/trending?limit=5`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.items || [];
  } catch {
    return [];
  }
}

// ── "For You" recommendation engine ─────────────────────────────────────────
interface UserProfile {
  categories: Record<string, number>;   // category → weight
  locations: Record<string, number>;    // location → weight
  avgPrice: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  transactionTypes: Record<string, number>;
  seenIds: Set<number>;
}

async function buildUserProfile(userId?: string): Promise<UserProfile | null> {
  const profile: UserProfile = {
    categories: {},
    locations: {},
    avgPrice: null,
    minPrice: null,
    maxPrice: null,
    transactionTypes: {},
    seenIds: new Set(),
  };

  const prices: number[] = [];

  // 1. Saved items (weight: 3)
  const savedIds: number[] = (() => {
    try {
      const raw = localStorage.getItem('favorites_v1') || localStorage.getItem('favorites') || '[]';
      const parsed = JSON.parse(raw);
      const ids = Array.isArray(parsed) ? parsed.map(Number) : Object.keys(parsed || {}).map(Number);
      return ids.filter(Boolean);
    } catch { return []; }
  })();

  // 2. Clicked items (weight: 1)
  const clickedIds: number[] = (() => {
    try { return JSON.parse(localStorage.getItem('clickedItems') || '[]').map(Number).filter(Boolean); }
    catch { return []; }
  })();

  // 3. Chatted item IDs from backend (weight: 2)
  let chattedItemIds: number[] = [];
  if (userId) {
    try {
      const res = await api.get('/messages/inbox');
      const convs = res.data?.conversations || [];
      chattedItemIds = convs
        .map((c: any) => Number(c.item_id))
        .filter(Boolean);
    } catch {}
  }

  const allIds = [
    ...savedIds.map(id => ({ id, weight: 3 })),
    ...chattedItemIds.map(id => ({ id, weight: 2 })),
    ...clickedIds.map(id => ({ id, weight: 1 })),
  ];

  if (allIds.length === 0) return null;

  // Track all seen IDs so we don't recommend them
  allIds.forEach(({ id }) => profile.seenIds.add(id));

  // Fetch item details for each unique ID
const uniqueIds = Array.from(new Set(allIds.map(x => x.id)));
  const weightMap: Record<number, number> = {};
  allIds.forEach(({ id, weight }) => {
    weightMap[id] = (weightMap[id] || 0) + weight;
  });

  const itemDetails = await Promise.all(
    uniqueIds.slice(0, 20).map(async id => {
      try {
        const res = await fetch(`${BACKEND_API}/items/${id}`);
        if (!res.ok) return null;
        const data = await res.json();
        return data.item as Item & { id: number };
      } catch {
        return null;
      }
    })
  );

  // Build profile from fetched items
  for (const item of itemDetails) {
    if (!item) continue;
    const w = weightMap[item.id] || 1;

    if (item.category) {
      profile.categories[item.category] = (profile.categories[item.category] || 0) + w;
    }
    if (item.location) {
      profile.locations[item.location] = (profile.locations[item.location] || 0) + w;
    }
    if (item.price) {
      prices.push(item.price);
    }
    if (item.transaction_type) {
      profile.transactionTypes[item.transaction_type] = (profile.transactionTypes[item.transaction_type] || 0) + w;
    }
  }

  if (prices.length > 0) {
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    profile.avgPrice = avg;
    profile.minPrice = avg * 0.5;  // ±50% price range
    profile.maxPrice = avg * 1.5;
  }

  return profile;
}

async function fetchForYou(profile: UserProfile): Promise<Item[]> {
  // Top category and location by weight
  const topCategory = Object.entries(profile.categories).sort((a, b) => b[1] - a[1])[0]?.[0];
  const topLocation = Object.entries(profile.locations).sort((a, b) => b[1] - a[1])[0]?.[0];
  const topTxType = Object.entries(profile.transactionTypes).sort((a, b) => b[1] - a[1])[0]?.[0];

  // Fetch candidates based on top category
  const params = new URLSearchParams();
  if (topCategory) params.append('category', topCategory);
  params.append('limit', '100');

  let items: Item[] = [];
  try {
    const res = await fetch(`${BACKEND_API}/items?${params}`);
    if (res.ok) {
      const data = await res.json();
      items = data.items || [];
    }
  } catch {
    return [];
  }

  // Remove already seen items
  items = items.filter(i => !profile.seenIds.has(i.id));

  // Score each item based on how well it matches the profile
  const scored = items.map(item => {
    let score = 0;

    // Category match (already filtered, but secondary categories get partial score)
    if (item.category === topCategory) score += 30;

    // Location match
    if (topLocation && item.location?.toLowerCase().includes(topLocation.toLowerCase())) score += 20;

    // Transaction type match
    if (topTxType && item.transaction_type === topTxType) score += 15;

    // Price similarity — closer to avg price = higher score
    if (profile.avgPrice && item.price) {
      const diff = Math.abs(item.price - profile.avgPrice) / profile.avgPrice;
      score += Math.max(0, 20 - diff * 40); // max 20 pts, fades with distance
    }

    // Price range filter (hard cutoff at ±50%)
    if (profile.minPrice && item.price && item.price < profile.minPrice) score -= 50;
    if (profile.maxPrice && item.price && item.price > profile.maxPrice) score -= 50;

    // Quality signals
    if (item.premium) score += 10;
    if (item.featured) score += 5;
    score += (item.avg_rating || 0) * 3;
    score += Math.min(item.rating_count || 0, 5);

    return { item, score };
  });

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  return scored
    .filter(x => x.score > 0)
    .slice(0, 5)
    .map(x => x.item);
}

function buildResponse(filters: ReturnType<typeof parseFilters>, count: number): string {
  if (count === 0) {
    let msg = "I couldn't find any listings matching your request.";
    if (filters.max_price) msg += ` Try increasing your budget above ETB ${filters.max_price.toLocaleString()}.`;
    if (filters.location) msg += ` Or try a different location.`;
    msg += " Want me to search without filters?";
    return msg;
  }

  const parts: string[] = [];
  if (filters.category) parts.push(filters.category);
  if (filters.transaction_type) parts.push(`for ${filters.transaction_type}`);
  if (filters.location) parts.push(`in ${filters.location}`);
  if (filters.max_price) parts.push(`under ETB ${filters.max_price.toLocaleString()}`);
  if (filters.min_price) parts.push(`above ETB ${filters.min_price.toLocaleString()}`);

  const desc = parts.length > 0 ? parts.join(', ') : 'your search';
  return `Found ${count} listing${count > 1 ? 's' : ''} for ${desc}, ranked by popularity:`;
}

// ── Component ────────────────────────────────────────────────────────────────
const FloatingAIAssistant: React.FC = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState<'discover' | 'foryou'>('discover');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'assistant',
      text: 'Hello! I am FasilLink AI 👋\n\nTell me exactly what you need:\n\n• "2 bedroom house to rent under 5000"\n• "Car for sale in Azezo"\n• "Furnished apartment in Gondar"\n• "Event hall outdoor under 3000"\n\nOr use the tabs above!',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const pushAssistant = (text: string, items?: Item[]) => {
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      type: 'assistant',
      text,
      timestamp: new Date(),
      items,
    }]);
  };

  const pushUser = (text: string) => {
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      type: 'user',
      text,
      timestamp: new Date(),
    }]);
  };

  const handleTabClick = async (tab: 'discover' | 'foryou') => {
    setActiveTab(tab);
    setIsLoading(true);
    try {
      if (tab === 'discover') {
        const items = await fetchTrending();
        if (items.length > 0) {
          pushAssistant('🔍 Top trending listings right now, ranked by popularity:', items);
        } else {
          pushAssistant('No listings found right now. Check back soon!');
        }
      } else {
        // ── Real "For You" logic ──
        pushAssistant('⏳ Analyzing your activity to find the best matches...');

        const profile = await buildUserProfile(user?.id ? String(user.id) : undefined);

        if (!profile) {
          // No activity at all
          const trending = await fetchTrending();
          pushAssistant(
            '💡 No activity yet! Save items, click on listings, or chat with owners — the more you interact, the smarter your recommendations get.\n\nHere are trending listings for now:',
            trending
          );
          return;
        }

        const topCategory = Object.entries(profile.categories).sort((a, b) => b[1] - a[1])[0]?.[0];
        const topLocation = Object.entries(profile.locations).sort((a, b) => b[1] - a[1])[0]?.[0];
        const totalInteractions = profile.seenIds.size;

        const items = await fetchForYou(profile);

        if (items.length === 0) {
          // Profile built but no new matches — show trending in same category
          const trending = await fetchTrending();
          pushAssistant(
            `⭐ You've interacted with ${totalInteractions} listings! We looked for more ${topCategory || 'items'} like the ones you liked but couldn't find new ones right now.\n\nHere are popular listings instead:`,
            trending
          );
          return;
        }

        // Build a human-readable explanation
        const parts: string[] = [];
        if (topCategory) parts.push(topCategory);
        if (topLocation) parts.push(`in ${topLocation}`);
        if (profile.avgPrice) parts.push(`around ETB ${Math.round(profile.avgPrice).toLocaleString()}`);

        pushAssistant(
          `⭐ Based on your ${totalInteractions} interaction${totalInteractions > 1 ? 's' : ''} — you seem to like ${parts.join(', ')}. Here are listings you'll probably love:`,
          items
        );
      }
    } catch {
      pushAssistant('⚠️ Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;
    const userText = inputValue.trim();
    pushUser(userText);
    setInputValue('');
    setIsLoading(true);

    try {
      const filters = parseFilters(userText);
      const hasFilters =
        filters.category ||
        filters.location ||
        filters.transaction_type ||
        filters.max_price != null ||
        filters.min_price != null ||
        filters.keywords.length > 0;

      if (hasFilters) {
        const items = await fetchAndRank(filters);
        pushAssistant(buildResponse(filters, items.length), items.length > 0 ? items : undefined);
      } else {
        const items = await fetchTrending();
        pushAssistant(
          "I wasn't sure what you're looking for. Here are the most popular listings right now:",
          items
        );
      }
    } catch {
      pushAssistant('⚠️ Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (item: Item) => {
    if (!item.price) return 'Price not listed';
    const p = item.price.toLocaleString();
    return item.transaction_type === 'rent' ? `ETB ${p}/month` : `ETB ${p}`;
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Open FasilLink AI assistant"
        className="fixed bottom-6 right-6 z-40 bg-[#6C3BFF] text-white rounded-full p-4 shadow-lg hover:bg-[#5A2FE0] hover:scale-110 transition-all duration-300 group"
      >
        <MessageCircle className="w-6 h-6" />
        <span className="absolute bottom-full right-0 mb-3 px-3 py-2 bg-neutral-900 text-white text-sm rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
          Ask AI for help!
        </span>
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/20"
      onMouseDown={() => setIsOpen(false)}
      role="presentation"
    >
      <div
        ref={panelRef}
        className={`absolute bottom-6 right-6 flex max-h-[80vh] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl transition-all duration-300 max-sm:bottom-4 max-sm:left-4 max-sm:right-4 ${isMinimized ? 'h-16 w-80 max-sm:w-auto' : 'h-[580px] w-[420px] max-sm:h-[80vh] max-sm:w-auto'}`}
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="FasilLink AI Assistant"
      >
      <div className="floating-ai-header">
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <span className="text-white text-sm">✨</span>
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">FasilLink AI Assistant</h3>
              <p className="text-xs text-white opacity-80">Powered by FasilLink AI</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => setIsMinimized(!isMinimized)}
              aria-label={isMinimized ? 'Maximize AI assistant' : 'Minimize AI assistant'}
              className="p-1.5 hover:bg-white hover:bg-opacity-20 rounded-lg transition-all text-white">
              {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
            </button>
            <button type="button" onClick={() => setIsOpen(false)}
              aria-label="Close AI assistant"
              className="p-1.5 hover:bg-white hover:bg-opacity-20 rounded-lg transition-all text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        {!isMinimized && (
          <div className="px-4 pb-3 flex gap-2">
            <button type="button" onClick={() => handleTabClick('discover')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'discover' ? 'bg-white text-[#6C3BFF] shadow-md' : 'bg-white bg-opacity-20 text-white hover:bg-opacity-30'}`}>
              🔍 Discover
            </button>
            <button type="button" onClick={() => handleTabClick('foryou')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'foryou' ? 'bg-white text-[#6C3BFF] shadow-md' : 'bg-white bg-opacity-20 text-white hover:bg-opacity-30'}`}>
              ⭐ For You
            </button>
          </div>
        )}
      </div>

      {!isMinimized && (
        <>
          <div className="floating-ai-body flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-full w-full">
                  <div className={`px-4 py-3 rounded-2xl ${
                    message.type === 'user'
                      ? 'bg-[#6C3BFF] text-white rounded-br-none ml-auto w-fit max-w-xs'
                      : 'bg-white border border-gray-100 text-gray-900 rounded-bl-none shadow-sm'
                  }`}>
                    <p className="text-sm leading-relaxed whitespace-pre-line">{message.text}</p>
                    <p className={`text-xs mt-1 ${message.type === 'user' ? 'opacity-70 text-right' : 'text-gray-400'}`}>
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>

                  {message.items && message.items.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {message.items.map((item, index) => (
                        <a key={item.id} href={`/item/${item.id}`}
                          className="flex gap-3 bg-white border border-gray-100 rounded-2xl p-3 hover:border-[#6C3BFF] hover:shadow-md transition-all no-underline group">
                          <div className={`floating-ai-rank-badge ${index === 0 ? 'rank-1' : index === 1 ? 'rank-2' : index === 2 ? 'rank-3' : 'rank-default'}`}>
                            {index + 1}
                          </div>
                          <img src={item.image_url || '/placeholder.png'} alt={item.title}
                            className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
                            onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.png'; }} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-900 truncate group-hover:text-[#6C3BFF] transition-colors">
                              {item.title}
                            </p>
                            <div className="flex gap-1 mt-0.5 flex-wrap">
                              {item.featured && (
                                <span className="text-[9px] bg-yellow-100 text-yellow-700 rounded-full px-1.5 py-0.5 font-semibold">⭐ Featured</span>
                              )}
                              {item.premium && (
                                <span className="text-[9px] bg-purple-100 text-purple-700 rounded-full px-1.5 py-0.5 font-semibold">💎 Premium</span>
                              )}
                              <span className={`text-[9px] rounded-full px-1.5 py-0.5 font-semibold ${
                                item.transaction_type === 'rent' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                              }`}>
                                {item.transaction_type === 'rent' ? 'Rent' : 'Sale'}
                              </span>
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5 truncate">
                              📍 {item.category} • {item.location}{item.subcity ? `, ${item.subcity}` : ''}
                            </p>
                            <p className="text-sm font-extrabold text-[#6C3BFF] mt-1">{formatPrice(item)}</p>
                          </div>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-100 px-4 py-3 rounded-2xl rounded-bl-none shadow-sm">
                  <div className="flex gap-1.5 items-center">
                    <div className="loading-dot" />
                    <div className="loading-dot delay-150" />
                    <div className="loading-dot delay-300" />
                    <span className="text-xs text-gray-400 ml-2">AI is thinking...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-gray-100 p-3 bg-white">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="e.g. furnished house rent under 4000 Azezo"
                className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6C3BFF] focus:border-transparent text-sm transition-all"
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={isLoading || !inputValue.trim()}
                aria-label="Send message"
                className="floating-ai-send-button px-3 py-2.5 bg-[#6C3BFF] text-white rounded-xl hover:bg-[#5A2FE0] disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:scale-105"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}
      </div>
    </div>
  );
};

export default FloatingAIAssistant;