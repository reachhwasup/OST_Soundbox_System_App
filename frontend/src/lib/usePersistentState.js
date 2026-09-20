import { useEffect, useState } from 'react';

/**
 * useState that is saved in localStorage. Object defaults are merged with the saved value so new keys
 * get their default. Storage errors (private mode, blocked storage) fall back to in-memory state.
 */
export default function usePersistentState(key, defaultValue) {
  const [value, setValue] = useState(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(key) || 'null');
      if (saved === null) return defaultValue;
      if (defaultValue && typeof defaultValue === 'object' && !Array.isArray(defaultValue)) {
        return { ...defaultValue, ...saved };
      }
      return saved;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage unavailable */
    }
  }, [key, value]);

  return [value, setValue];
}
