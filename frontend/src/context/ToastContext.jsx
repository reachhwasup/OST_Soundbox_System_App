import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle2, Unlink, Link2, RefreshCw, AlertCircle, X } from 'lucide-react';

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
      
      {/* Slide-In Modal Toast Container (Fixed Top-Right) */}
      <div className="fixed top-3 right-3 sm:top-4 sm:right-4 z-[9999] flex flex-col gap-2 pointer-events-none max-w-[340px] sm:max-w-[370px] w-full px-2 sm:px-0">
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
  let bgClasses = "bg-white/95 dark:bg-slate-900/95 border-slate-200/80 dark:border-slate-800/80 text-slate-800 dark:text-slate-100";
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
  } else if (type === 'error' || type === 'danger') {
    Icon = AlertCircle;
    iconBg = "bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400";
    progressBarColor = "bg-rose-500";
    badgeText = "Failed";
    badgeColor = "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300";
  }

  return (
    <div
      className={`pointer-events-auto relative overflow-hidden rounded-xl border shadow-lg backdrop-blur-md transition-all duration-300 ${bgClasses} ${
        isExiting ? 'animate-slide-out-right' : 'animate-slide-in-right'
      }`}
      role="alert"
    >
      <div className="p-2.5 sm:p-3 flex items-start gap-2.5">
        {/* Leading Icon */}
        <div className={`p-1.5 sm:p-2 rounded-lg shrink-0 flex items-center justify-center ${iconBg}`}>
          <Icon className="w-4 h-4" />
        </div>

        {/* Text Content */}
        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded-full ${badgeColor}`}>
              {badgeText}
            </span>
            {safeTitle && (
              <h4 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                {safeTitle}
              </h4>
            )}
          </div>
          {safeMessage && (
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-snug break-words">
              {safeMessage}
            </p>
          )}
        </div>

        {/* Manual Close Button */}
        <button
          onClick={onRemove}
          className="shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Close notification"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 5s Animated Progress Countdown Bar */}
      <div className="w-full bg-slate-100 dark:bg-slate-800 h-0.5">
        <div
          className={`h-full ${progressBarColor} animate-toast-progress`}
          style={{ animationDuration: `${duration}ms` }}
        />
      </div>
    </div>
  );
}

