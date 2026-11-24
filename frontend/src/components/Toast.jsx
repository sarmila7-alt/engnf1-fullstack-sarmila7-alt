import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const ToastContext = createContext(null);
export const useToast = () => useContext(ToastContext);

let nextId = 1;
const STYLES = {
  error: 'border-red-200 bg-red-50 text-red-900',
  success: 'border-green-200 bg-green-50 text-green-900',
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => setToasts((all) => all.filter((t) => t.id !== id)), []);
  const push = useCallback((type, message) => {
    const id = nextId++;
    setToasts((all) => [...all, { id, type, message }]);
    setTimeout(() => remove(id), 7000);
  }, [remove]);

  const api = useMemo(() => ({
    error: (message) => push('error', message),
    success: (message) => push('success', message),
  }), [push]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed inset-x-4 bottom-4 z-50 flex flex-col items-end gap-2 sm:left-auto sm:w-96" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`w-full rounded-lg border p-3 text-sm shadow-lg break-words ${STYLES[t.type]}`}>
            <div className="flex items-start justify-between gap-3">
              <span>{t.message}</span>
              <button onClick={() => remove(t.id)} className="font-semibold" aria-label="Dismiss">×</button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}