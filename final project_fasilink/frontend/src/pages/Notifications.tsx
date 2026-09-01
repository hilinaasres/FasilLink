import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const Notifications: React.FC = () => {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [userNotifications, setUserNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get('/notifications', { params: { userId: user?.id } });
        setAnnouncements(res.data.announcements || []);
        setUserNotifications(res.data.notifications || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [user?.id]);

  if (loading) return <div className="chat-empty-center">Loading notifications...</div>;

  return (
    <div className="notifications-shell">
      <h1>Notifications & Announcements</h1>
      
      <section className="section-spacing">
        <h2>System Announcements</h2>
        {announcements.length === 0 ? <p>No company announcements.</p> : (
          announcements.map(a => (
            <div key={a.id} className="announcement-box">
              <h3 className="no-margin">{a.title}</h3>
              <p className="no-margin">{a.message}</p>
              <small className="muted">{new Date(a.created_at).toLocaleDateString()}</small>
            </div>
          ))
        )}
      </section>

      <section>
        <h2>Your Account Alerts</h2>
        {userNotifications.length === 0 ? <p>No personalized alerts.</p> : (
            userNotifications.map(n => (
            <div key={n.id} className={`user-notification-box ${n.type === 'warning' ? 'warning' : 'info'}`}>
              <h3 className="no-margin">{n.title}</h3>
              <p className="no-margin">{n.message}</p>
              <small className="muted">{new Date(n.created_at).toLocaleDateString()}</small>
            </div>
          ))
        )}
      </section>
    </div>
  );
};

export default Notifications;