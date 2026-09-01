import { AnimatePresence, motion } from 'framer-motion';
import { createContext, useContext, useMemo, useState } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const notify = (message, type = 'success') => {
    const id = Date.now();
    setToasts((current) => [...current, { id, message, type }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 4500);
  };

  const value = useMemo(() => ({ notify }), []);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex w-full max-w-sm flex-col gap-3 px-3 sm:px-0">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.96 }}
              transition={{ duration: 0.2 }}
              className={`panel-card px-4 py-3 shadow-glow border ${
                toast.type === 'success'
                  ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200'
                  : toast.type === 'warning'
                  ? 'border-amber-500/20 bg-amber-500/10 text-amber-200'
                  : 'border-rose-500/20 bg-rose-500/10 text-rose-200'
              }`}
            >
              <p className="text-sm leading-6">{toast.message}</p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
