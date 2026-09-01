import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const StarsText: React.FC<{ avg?: number; count?: number }> = ({ avg, count }) => {
  const a = Number(avg || 0);
  const filled = Math.round(a);
  const stars = Array.from({ length: 5 }, (_, i) => (i < filled ? '⭐' : '☆')).join('');
  return (
    <span title={count ? `${a.toFixed(1)} (${count})` : 'No ratings yet'} className="text-sm">
      {stars}{count ? ` (${count})` : ''}
    </span>
  );
};

const CustomerDashboard: React.FC = () => {
  const { user } = useAuth();
  const role = user?.role;

  const [favorites, setFavorites] = useState<any[]>([]);

  useEffect(() => {
    if (!user || role === 'owner') return;
    api
      .get('/favorites')
      .then((res) => setFavorites(res.data?.items || []))
      .catch(() => setFavorites([]));
  }, [user, role]);

  if (!user) {
    return (
      <div className="owner-container">
        <div className="owner-header">
          <h1>My Account</h1>
        </div>
        <div className="post-form-card">
          <p>You need to login to view your account.</p>
          <Link className="btn-primary" to="/login">Login</Link>
        </div>
      </div>
    );
  }

  if (role === 'owner') {
    return (
      <div className="owner-container">
        <div className="owner-header">
          <h1>Owner Account</h1>
        </div>
        <div className="post-form-card">
          <p>This page is for customers. Open the publishing form to post an item.</p>
          <Link className="btn-primary" to="/customer-posting/add">Post Item</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="owner-container">
      <div className="owner-header">
        <h1>My Account</h1>
      </div>

      <div className="post-form-card">
        <h2 className="mt-0">Favorites</h2>
        {favorites.length === 0 ? (
          <p>You have no favorite items yet. Tap 🤍 on a listing to save it.</p>
        ) : (
          <div className="flex-column-gap">
            {favorites.map((it) => (
              <Link
                key={it.id}
                to={`/item/${it.id}`}
                className="message-bubble received conversation-link link-no-decoration"
              >
                <div className="row-space">
                  <strong>{it.title}</strong>
                  <span className="small-opacity">{Number(it.price).toLocaleString()} ETB</span>
                </div>
                <div className="row-space-wrap">
                  <span className="small-opacity">📍 {it.location}</span>
                  <StarsText avg={Number(it.avg_rating)} count={Number(it.rating_count)} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="post-form-card">
        <h2 className="mt-0">Recommendations</h2>
        <p>Chat with the AI Assistant to get personalized recommendations.</p>
        <Link className="btn-primary" to="/ai-assistant">Open AI Assistant</Link>
      </div>

      <div className="post-form-card">
        <h2 className="mt-0">Publish an item</h2>
        <p>Open the customer publishing form to add your own listing.</p>
        <Link className="btn-primary" to="/customer-posting/add">Post Item</Link>
      </div>

      <div className="post-form-card">
        <h2 className="mt-0">Browse</h2>
        <p>Search listings and open item details.</p>
        <Link className="btn-primary" to="/search">Browse Listings</Link>
      </div>
    </div>
  );
};

export default CustomerDashboard;
