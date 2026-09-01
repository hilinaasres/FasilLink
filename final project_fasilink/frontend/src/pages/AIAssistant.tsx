import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './AIAssistant.css';

const AI_BASE = process.env.REACT_APP_AI_BASE_URL || 'http://localhost:5001/api';

type Item = {
  id: number;
  title: string;
  location: string;
  subcity: string;
  price: number | null;
  transaction_type: string;
  category: string;
  image_url: string;
  featured: boolean;
  premium: boolean;
};

type Message = {
  sender: 'User' | 'AI';
  text: string;
  items?: Item[];
};

// Parse user message to extract filters
function parseMessage(text: string): { category?: string; location?: string; max_price?: number; min_price?: number } {
  const lower = text.toLowerCase();
  const filters: any = {};

  // Category detection
  if (lower.includes('house') || lower.includes('home') || lower.includes('apartment')) filters.category = 'Homes';
  else if (lower.includes('car') || lower.includes('vehicle') || lower.includes('toyota') || lower.includes('auto')) filters.category = 'Vehicles';
  else if (lower.includes('event') || lower.includes('decor')) filters.category = 'Event Materials';

  // Location detection — common Gondar areas
  const locations = ['arada', 'azezo', 'maraki', 'fasil', 'gondar', 'piassa', 'piyassa', 'teda', 'kebele'];
  for (const loc of locations) {
    if (lower.includes(loc)) { filters.location = loc; break; }
  }

  // Price detection — e.g. "under 5000", "below 10000", "max 3000"
  const underMatch = lower.match(/(?:under|below|max|less than)\s*(\d[\d,]*)/);
  if (underMatch) filters.max_price = parseFloat(underMatch[1].replace(',', ''));

  const aboveMatch = lower.match(/(?:above|over|min|more than)\s*(\d[\d,]*)/);
  if (aboveMatch) filters.min_price = parseFloat(aboveMatch[1].replace(',', ''));

  return filters;
}

const AIAssistant: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    { sender: 'AI', text: "Hello! I'm FasilLink's AI Assistant 👋\n\nI can help you find what you need. Try asking:\n• \"Show me homes in Arada under 5000 ETB\"\n• \"Find cars for sale in Gondar\"\n• \"What's trending in vehicles?\"" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userText = input.trim();
    setMessages(prev => [...prev, { sender: 'User', text: userText }]);
    setInput('');
    setLoading(true);

    try {
      const filters = parseMessage(userText);
      const hasFilters = Object.keys(filters).length > 0;

      if (hasFilters) {
        // Function 1: filtered + ranked trending
        const params = new URLSearchParams();
        if (filters.category)  params.append('category',  filters.category);
        if (filters.location)  params.append('location',  filters.location);
        if (filters.max_price) params.append('max_price', String(filters.max_price));
        if (filters.min_price) params.append('min_price', String(filters.min_price));
        params.append('limit', '6');

        const res = await axios.get(`${AI_BASE}/trending?${params}`);
        const data = res.data;

        if (data.items && data.items.length > 0) {
          setMessages(prev => [...prev, {
            sender: 'AI',
            text: `Here are the top results for your search, ranked by popularity:`,
            items: data.items
          }]);
        } else {
          setMessages(prev => [...prev, {
            sender: 'AI',
            text: `I couldn't find any listings matching your request. Try adjusting the location or price range.`
          }]);
        }

      } else {
        // No specific filters — return overall trending
        const res = await axios.get(`${AI_BASE}/trending?limit=6`);
        const data = res.data;
        setMessages(prev => [...prev, {
          sender: 'AI',
          text: `Here are the most popular listings on FasilLink right now:`,
          items: data.items || []
        }]);
      }

    } catch (error) {
      setMessages(prev => [...prev, {
        sender: 'AI',
        text: "Sorry, I'm having trouble connecting right now. Please try again in a moment."
      }]);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (item: Item) => {
    if (!item.price) return 'Price not listed';
    const p = item.price.toLocaleString();
    return item.transaction_type === 'rent' ? `${p} ETB/month` : `${p} ETB`;
  };

  return (
    <div className="ai-assistant-page">
      
      {/* Header */}
      <div className="ai-assistant-header">
        <h2 className="ai-assistant-header-title">FasilLink AI Assistant</h2>
        <p className="ai-assistant-header-subtitle">Powered by your live listings</p>
      </div>

      {/* Messages */}
      <div className="ai-assistant-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`ai-assistant-message-wrap ${msg.sender === 'User' ? 'user' : 'ai'}`}>
            {/* Bubble */}
            <div className={`ai-assistant-message-bubble ${msg.sender === 'User' ? 'user' : 'ai'}`}>
              {msg.text}
            </div>

            {/* Item cards */}
            {msg.items && msg.items.length > 0 && (
              <div className="ai-assistant-item-list">
                {msg.items.map(item => (
                  <Link key={item.id} to={`/item/${item.id}`} className="ai-assistant-item-link">
                    <div className="ai-assistant-item-card">
                      {/* Image */}
                      <img
                        src={item.image_url || '/placeholder.png'}
                        alt={item.title}
                        className="ai-assistant-item-image"
                        onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.png'; }}
                      />
                      {/* Info */}
                      <div className="ai-assistant-item-info">
                        <div className="ai-assistant-item-title-row">
                          <span className="ai-assistant-item-title">
                            {item.title}
                          </span>
                          {item.featured && <span className="ai-assistant-item-tag featured">Featured</span>}
                          {item.premium && <span className="ai-assistant-item-tag premium">Premium</span>}
                        </div>
                        <div className="ai-assistant-item-meta">
                          {item.category} • {item.location}{item.subcity ? `, ${item.subcity}` : ''}
                        </div>
                        <div className="ai-assistant-item-price">
                          {formatPrice(item)}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="ai-assistant-loading">
            Searching listings...
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="ai-assistant-form">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          disabled={loading}
          placeholder="E.g. homes in Arada under 5000 ETB..."
          className="ai-assistant-input"
        />
        <button
          type="submit"
          disabled={loading}
          className="ai-assistant-submit"
        >
          Ask
        </button>
      </form>
    </div>
  );
};

export default AIAssistant;