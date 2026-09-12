import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle2, Unlink, Link2, RefreshCw, AlertCircle, Info, Sparkles, X } from 'lucide-react';

const ToastContext = createContext(null);

function formatToastContent(val) {
  if (val == null) return '';
  if (typeof val === 'string' || typeof val === 'number') return String(val);
  if (Array.isArray(val)) {
    return val
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object') {
          const field = Array.isArray(item.loc) ? item.loc[item.loc.length - 1] : '';
          return field ? `${field}: ${item.msg || JSON.stringify(item)}` : (item.msg || JSON.stringify(item));
        }
        return String(item);
      })
      .join(', ');
  }
  if (typeof val === 'object') {
    return val.msg || val.message || JSON.stringify(val);
  }
  return String(val);
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback(({ type = 'success', title, message, duration = 5000 }) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    const safeTitle = formatToastContent(title);
    const safeMessage = formatToastContent(message);
    const newToast = { id, type, title: safeTitle, message: safeMessage, duration, isExiting: false };

    setToasts((prev) => [...prev, newToast]);

    // Set exit animation slightly before removal
    setTimeout(() => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, isExiting: true } : t))
      );
    }, Math.max(0, duration - 350));

    // Remove from state after duration
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isExiting: true } : t))
    );
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 300);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      
      {/* Responsive Toast Container:
          - Mobile (< sm): Centered horizontally at the top, safely padded from notch
          - Tablet & Desktop (>= sm): Pinned to top-right corner */}
      <div 
        className="fixed top-2.5 sm:top-4 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:right-4 z-[99999] flex flex-col gap-2.5 pointer-events-none w-[calc(100vw-24px)] max-w-[420px] sm:w-[380px] md:w-[420px] pt-[env(safe-area-inset-top,0px)]"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

function ToastItem({ toast, onRemove }) {
  const { type, title, message, isExiting, duration } = toast;
  const safeTitle = formatToastContent(title);
  const safeMessage = formatToastContent(message);

  // Icon & Theme Styling based on Action Type
  let Icon = CheckCircle2;
  let bgClasses = "bg-white/95 dark:bg-slate-900/95 border-slate-200/90 dark:border-slate-800/90 text-slate-800 dark:text-slate-100";
  let iconBg = "bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400";
  let progressBarColor = "bg-emerald-500";
  let badgeText = "Success";
  let badgeColor = "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300";

  if (type === 'link' || type === 'linked') {
    Icon = Link2;
    iconBg = "bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400";
    progressBarColor = "bg-emerald-500";
    badgeText = "Linked";
    badgeColor = "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300";
  } else if (type === 'unlink' || type === 'unlinked') {
    Icon = Unlink;
    iconBg = "bg-amber-100 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400";
    progressBarColor = "bg-amber-500";
    badgeText = "Unlinked";
    badgeColor = "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300";
  } else if (type === 'update' || type === 'updated') {
    Icon = RefreshCw;
    iconBg = "bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400";
    progressBarColor = "bg-emerald-500";
    badgeText = "Updated";
    badgeColor = "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300";
  } else if (type === 'add' || type === 'added') {
    Icon = Sparkles;
    iconBg = "bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400";
    progressBarColor = "bg-emerald-500";
    badgeText = "Created";
    badgeColor = "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300";
  } else if (type === 'info') {
    Icon = Info;
    iconBg = "bg-blue-100 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400";
    progressBarColor = "bg-blue-500";
    badgeText = "Info";
    badgeColor = "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300";
  } else if (type === 'error' || type === 'danger') {
    Icon = AlertCircle;
    iconBg = "bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400";
    progressBarColor = "bg-rose-500";
    badgeText = "Notice";
    badgeColor = "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300";
  }

  return (
    <div
      className={`pointer-events-auto relative overflow-hidden rounded-2xl border shadow-xl shadow-slate-900/10 dark:shadow-black/50 backdrop-blur-xl transition-all duration-300 ${bgClasses} ${
        isExiting ? 'animate-toast-out' : 'animate-toast-in'
      }`}
      role="alert"
    >
      <div className="p-3 sm:p-3.5 flex items-start gap-3">
        {/* Leading Icon */}
        <div className={`p-2 sm:p-2.5 rounded-xl shrink-0 flex items-center justify-center ${iconBg}`}>
          <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>

        {/* Text Content */}
        <div className="flex-1 min-w-0 pr-0.5">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${badgeColor}`}>
              {badgeText}
            </span>
            {safeTitle && (
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate max-w-[240px] sm:max-w-none">
                {safeTitle}
              </h4>
            )}
          </div>
          {safeMessage && (
            <p className="text-xs sm:text-[13px] text-slate-600 dark:text-slate-300 leading-relaxed break-words mt-0.5">
              {safeMessage}
            </p>
          )}
        </div>

        {/* Manual Close Button - Large touch target on mobile/tablet */}
        <button
          onClick={onRemove}
          className="shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 -mr-1.5 -mt-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer touch-manipulation active:scale-90"
          aria-label="Close notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Animated Progress Countdown Bar */}
      <div className="w-full bg-slate-100/60 dark:bg-slate-800/60 h-1">
        <div
          className={`h-full ${progressBarColor} animate-toast-progress`}
          style={{ animationDuration: `${duration}ms` }}
        />
      </div>
    </div>
  );
}

