import React from 'react';
import { Link } from 'react-router-dom';
import FavoriteButton from './favorites/FavoriteButton';

interface FeedItem {
  id: number;
  title: string;
  price: number;
  location: string;
  transaction_type: 'rent' | 'sell';
  image_url?: string;
  avg_rating?: number;
  rating_count?: number;
  category?: string;
  metadata?: any;
}

interface MarketplaceCardProps {
  item: FeedItem;
  showType?: boolean;
}

const MarketplaceCard: React.FC<MarketplaceCardProps> = ({ item, showType = false }) => {
  // Normalize category
  const getCategory = (cat?: string) => {
    if (!cat) return '';
    const c = cat.toLowerCase();
    if (c.includes('home') || c.includes('house')) return 'House';
    if (c.includes('vehicle') || c.includes('car')) return 'Car';
    if (c.includes('event')) return 'Event';
    return cat;
  };

  const renderMetadata = () => {
    if (!item.metadata) return null;
    const metadata = typeof item.metadata === 'string' ? JSON.parse(item.metadata) : item.metadata;
    const metaItems: React.ReactNode[] = [];
    const cat = getCategory(item.category);

    if (cat === 'House') {
      if (metadata.bedrooms && Number(metadata.bedrooms) > 0) metaItems.push(<><span role="img" aria-label="bed">🛏</span> {metadata.bedrooms} Beds</>);
      if (metadata.wifi === true) metaItems.push(<><span role="img" aria-label="wifi">📶</span> WiFi</>);
      if (metadata.balcony === true) metaItems.push(<><span role="img" aria-label="balcony">🪟</span> Balcony</>);
    } else if (cat === 'Car') {
      if (metadata.year) metaItems.push(<><span role="img" aria-label="year">📅</span> {metadata.year}</>);
      if (metadata.transmission) metaItems.push(<><span role="img" aria-label="transmission">⚙️</span> {metadata.transmission}</>);
      if (metadata.fuel) metaItems.push(<><span role="img" aria-label="fuel">⛽</span> {metadata.fuel}</>);
    } else if (cat === 'Event') {
      if (metadata.locationIndoor !== undefined)
        metaItems.push(<>{metadata.locationIndoor ? <><span role="img" aria-label="indoor">🏠</span> Indoor</> : <><span role="img" aria-label="outdoor">🌿</span> Outdoor</>}</>);
      if (metadata.capacity && Number(metadata.capacity) > 0) metaItems.push(<><span role="img" aria-label="people">👥</span> {metadata.capacity} People</>);
      if (metadata.setupIncluded === true) metaItems.push(<><span role="img" aria-label="setup">✅</span> Setup Included</>);
    }
    return metaItems.length > 0 ? metaItems : null;
  };

  const metaItems = renderMetadata();

  return (
    <div className="marketplaceCard">
      <div className="cardImage relative">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.title}
            loading="lazy"
            onError={(e) => {
              const target = e.currentTarget as HTMLImageElement;
              target.src = 'https://via.placeholder.com/400x300?text=No+Image';
            }}
          />
        ) : (
          <div className="cardImagePlaceholder">No image</div>
        )}

        <div className="absolute right-3 top-3 z-10">
          <FavoriteButton
            item={{
              id: String(item.id),
              title: item.title,
              price: item.price,
              location: item.location,
              image_url: item.image_url,
              category: item.category,
              transaction_type: item.transaction_type,
            }}
          />
        </div>
      </div>
      <div className="cardBody">
        {showType && item.category && (
          <div className="cardCategoryBadge">{item.category}</div>
        )}
        <h3 className="cardTitle">{item.title}</h3>
        <div className="cardLocation">📍 {item.location || 'Gondar'}</div>
        {metaItems && metaItems.length > 0 && (
          <div className="text-xs text-slate-600 my-2 flex flex-wrap gap-2">
            {metaItems.map((meta, idx) => (
              <span key={idx} className="bg-slate-100 px-2 py-1 rounded-lg flex items-center gap-1">
                {meta}
              </span>
            ))}
          </div>
        )}
        <div className="cardPrice">ETB {Number(item.price).toLocaleString()}</div>
        {item.avg_rating && (
          <div className="cardRating">
            {'⭐'.repeat(Math.min(5, Math.round(Number(item.avg_rating))))}
            <span>({item.rating_count || 0})</span>
          </div>
        )}
        <Link to={`/item/${item.id}`} className="cardViewBtn">
          View Details
        </Link>
      </div>
    </div>
  );
};

export default MarketplaceCard;
