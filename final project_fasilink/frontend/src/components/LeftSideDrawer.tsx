import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface LeftSideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const LeftSideDrawer: React.FC<LeftSideDrawerProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const isOwner = Boolean(user?.isSeller) || String(user?.role || '').toLowerCase() === 'admin';
  const isCustomer = !user?.isSeller && Boolean(user);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <>
      {isOpen && (
        <div className="drawer-overlay" onClick={onClose} />
      )}
      <nav className={`left-drawer ${isOpen ? 'open' : ''}`}>
        <div className="drawer-content">
          <div className="drawer-section">
            <h3 className="drawer-section-title">Categories</h3>
            <Link to="/search?category=homes" className="drawer-link" onClick={onClose}>
              Homes
            </Link>
            <Link to="/search?category=land" className="drawer-link" onClick={onClose}>
              Land
            </Link>
            <Link to="/search?category=cars" className="drawer-link" onClick={onClose}>
              Cars
            </Link>
            <Link to="/search?category=events" className="drawer-link" onClick={onClose}>
              Events
            </Link>
          </div>

          <div className="drawer-section">
            <h3 className="drawer-section-title">Support</h3>
            <Link to="/help" className="drawer-link" onClick={onClose}>
              Help Center
            </Link>
            <Link to="/settings" className="drawer-link" onClick={onClose}>
              Settings
            </Link>
          </div>

          <div className="drawer-section">
            <h3 className="drawer-section-title">Account</h3>
            <Link to="/customer" className="drawer-link" onClick={onClose}>
              Customer Dashboard
            </Link>
            {isOwner && (
              <Link to="/owner" className="drawer-link" onClick={onClose}>
                Owner Dashboard
              </Link>
            )}
            {isCustomer && (
              <Link to="/chat" className="drawer-link" onClick={onClose}>
                Chat
              </Link>
            )}
            <Link to="/ai-assistant" className="drawer-link" onClick={onClose}>
              AI Assistant
            </Link>
          </div>

          <div className="drawer-section drawer-bottom">
            <a href="https://wa.me/251900000000" className="drawer-link" target="_blank" rel="noopener noreferrer">
              WhatsApp
            </a>
          </div>
        </div>
      </nav>
    </>
  );
};

export default LeftSideDrawer;