import React, { useState } from 'react';
import { Mail, Phone, MapPin, Globe, Share, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

const Footer: React.FC = () => {
  const [email, setEmail] = useState('');
  const [subscribeMessage, setSubscribeMessage] = useState('');
  const [subscribeError, setSubscribeError] = useState(false);
  const currentYear = new Date().getFullYear();

  const handleSubscribe = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubscribeMessage('');
    setSubscribeError(false);
    try {
      await api.post('/newsletter', { email });
      setEmail('');
      setSubscribeMessage('Thanks for subscribing!');
    } catch (error: any) {
      setSubscribeError(true);
      setSubscribeMessage(error?.response?.data?.error || 'Unable to subscribe right now.');
    }
  };

  return (
    <footer className="bg-[#111827] text-neutral-200 py-12">
      <div className="max-w-[1280px] mx-auto px-5">
        {/* Modern Footer Grid: responsive */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Brand & Social */}
          <div className="md:col-span-1 space-y-4">
            <div className="flex items-center gap-3">
              <img src="/fasillink_log.png" alt="FasilLink" className="h-8 w-auto" />
              <h3 className="text-xl font-bold text-white">FasilLink</h3>
            </div>
            <p className="text-sm text-neutral-400 leading-relaxed">
              AI-powered marketplace connecting buyers and renters with local sellers across Gondar.
            </p>

            <div className="flex items-center gap-3 mt-2">
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook" title="Facebook" className="p-2 rounded-full bg-neutral-800 hover:bg-[#6C3BFF] transition-colors">
                <Globe className="w-4 h-4 text-white" />
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" aria-label="Twitter" title="Twitter" className="p-2 rounded-full bg-neutral-800 hover:bg-[#6C3BFF] transition-colors">
                <Share className="w-4 h-4 text-white" />
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" title="LinkedIn" className="p-2 rounded-full bg-neutral-800 hover:bg-[#6C3BFF] transition-colors">
                <Users className="w-4 h-4 text-white" />
              </a>
            </div>
          </div>

          {/* Links cluster */}
          <div className="md:col-span-2 grid grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">Explore</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/about" className="text-neutral-400 hover:text-white transition-colors">About FasilLink</Link></li>
                <li><Link to="/careers" className="text-neutral-400 hover:text-white transition-colors">Careers</Link></li>
                <li><Link to="/press" className="text-neutral-400 hover:text-white transition-colors">Press</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">Support</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/help" className="text-neutral-400 hover:text-white transition-colors">Help Center</Link></li>
                <li><Link to="/faq" className="text-neutral-400 hover:text-white transition-colors">FAQ</Link></li>
                <li><Link to="/terms" className="text-neutral-400 hover:text-white transition-colors">Terms & Conditions</Link></li>
                <li><Link to="/privacy" className="text-neutral-400 hover:text-white transition-colors">Privacy Policy</Link></li>
              </ul>
            </div>
          </div>

          {/* Contact & Newsletter */}
          <div className="md:col-span-1 space-y-4">
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider">Contact</h4>
            <ul className="space-y-3 text-sm text-neutral-400">
              <li className="flex items-center gap-2"><MapPin className="w-4 h-4" /><span>Gondar, Ethiopia</span></li>
              <li className="flex items-center gap-2"><Phone className="w-4 h-4" /><a href="tel:+251935545413" className="hover:text-white transition-colors">+251 935 545 413</a></li>
              <li className="flex items-center gap-2"><Mail className="w-4 h-4" /><a href="mailto:info@fasillink.com" className="hover:text-white transition-colors">info@fasillink.com</a></li>
            </ul>

            <div>
              <h5 className="text-sm font-medium text-white">Stay in the loop</h5>
              <form onSubmit={handleSubscribe} className="mt-2 flex gap-2">
                <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Your email" className="flex-1 rounded-xl px-3 py-2 bg-neutral-900 text-white placeholder-neutral-500 outline-none" />
                <button className="px-4 py-2 rounded-xl bg-[#6C3BFF] text-white font-semibold hover:bg-[#5530d1] transition-colors">Subscribe</button>
              </form>
              {subscribeMessage && <p className={`text-xs ${subscribeError ? 'text-red-300' : 'text-emerald-300'}`}>{subscribeMessage}</p>}
            </div>
          </div>

        </div>

        <div className="border-t border-neutral-700 my-8"></div>

        <div className="flex flex-col md:flex-row items-center justify-between text-xs text-neutral-500 gap-3">
          <p className="text-center md:text-left">&copy; {currentYear} FasilLink. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link to="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-white transition-colors">Terms</Link>
            <Link to="/cookies" className="hover:text-white transition-colors">Cookies</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
