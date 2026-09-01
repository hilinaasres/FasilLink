import { NavLink } from 'react-router-dom';
import { menuItems } from '../../config/menuItems';

export default function Sidebar({ collapsed, hidden, onToggle, onClose, onLogout }) {
  return (
    <aside className={`fixed inset-y-0 left-0 z-40 border-b lg:border-b-0 lg:border-r border-slate-800/80 bg-slate-950/95 shadow-glow backdrop-blur-xl transform transition-transform duration-300 lg:sticky lg:top-0 lg:h-screen lg:block lg:flex-shrink-0 ${collapsed ? 'w-16 lg:w-16' : 'w-full sm:w-72 lg:w-56'} ${hidden ? '-translate-x-full lg:translate-x-0' : 'translate-x-0'}`}>
      <div className="flex h-full flex-col justify-between py-4">
        
        {/* Top Header Panel - Static */}
        <div className={`flex-shrink-0 ${collapsed ? 'px-3' : 'px-4'}`}>
          <div className="mb-6 flex items-center justify-between gap-2 px-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-500 text-white shadow-lg shadow-sky-500/15 flex-shrink-0">
              <span className="text-base font-bold">F</span>
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0 ml-2">
                <p className="text-[0.65rem] uppercase tracking-[0.32em] text-slate-500 truncate">FasilLink</p>
                <p className="text-base font-semibold text-white truncate">Admin</p>
              </div>
            )}
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-800/80 bg-slate-900/80 text-slate-300 transition duration-300 hover:border-slate-700 hover:text-white lg:hidden"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>

        {/* Scrollable Navigation - Dynamic */}
        <div className={`flex-1 overflow-y-auto custom-scrollbar ${collapsed ? 'px-2' : 'px-3'}`}>
          <nav className="space-y-1">
            {menuItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `group flex items-center gap-3 rounded-[20px] px-3.5 py-2 text-sm font-medium transition duration-300 ${
                    isActive
                      ? 'bg-gradient-to-r from-slate-800/95 via-slate-900/95 to-sky-950/95 text-white shadow-[0_0_18px_rgba(56,189,248,0.12)] ring-1 ring-sky-400/20'
                      : 'text-slate-400 hover:bg-slate-800/70 hover:text-white hover:ring-1 hover:ring-sky-400/10 hover:shadow-[0_0_14px_rgba(56,189,248,0.06)]'
                  }`
                }
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 flex-shrink-0 text-sky-300/90" fill="currentColor">
                  <path d={item.icon} />
                </svg>
                {!collapsed && <span className="truncate">{item.label}</span>}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Bottom Actions Panel - Static */}
        <div className={`flex-shrink-0 mt-4 space-y-2 ${collapsed ? 'px-2' : 'px-4'}`}>
          <button
            type="button"
            onClick={onToggle}
            className="flex w-full items-center justify-center rounded-[20px] border border-slate-800/80 bg-slate-900/80 px-3 py-2 text-sm text-slate-300 transition duration-300 hover:border-slate-700 hover:text-white"
          >
            <svg viewBox="0 0 24 24" className={`h-4 w-4 ${collapsed ? '' : 'mr-2'}`} fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 12h16M12 4l8 8-8 8" />
            </svg>
            {!collapsed && <span className="truncate">Collapse</span>}
          </button>
          {!collapsed && (
            <button
              type="button"
              onClick={onLogout}
              className="flex w-full items-center justify-center rounded-[20px] bg-rose-500/10 px-3 py-2 text-sm font-medium text-rose-200 transition duration-300 hover:bg-rose-500/15"
            >
              Logout
            </button>
          )}
        </div>

      </div>
    </aside>
  );
}
