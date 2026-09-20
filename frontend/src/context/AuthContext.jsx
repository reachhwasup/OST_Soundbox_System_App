import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import api from '../api';
import { readSession, clearSession } from '../lib/authSession';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [initialSession] = useState(() => readSession(localStorage));
  const [user, setUser] = useState(initialSession.user);
  const [token, setToken] = useState(initialSession.token);
  const sessionVersion = useRef(0);
  const [authError, setAuthError] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleUnauthorized = () => {
      sessionVersion.current += 1;
      clearSession(localStorage);
      setAuthError('');
      setUser(null);
      setToken(null);
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const version = sessionVersion.current;
    const isCurrent = () => !cancelled && version === sessionVersion.current;
    const checkAuth = async () => {
      setLoading(true);
      setAuthError('');
      if (token) {
        try {
          const res = await api.get('/api/auth/me');
          if (!res.data?.user) throw new Error('Invalid session response');
          if (isCurrent()) {
            setUser(res.data.user);
            localStorage.setItem('user', JSON.stringify(res.data.user));
          }
        } catch (err) {
          if (isCurrent()) {
            if (err.response?.status === 401) {
              clearSession(localStorage);
              setUser(null);
              setToken(null);
            } else {
              setAuthError('Unable to verify your session. Check your connection and try again.');
            }
          }
        }
      }
      if (isCurrent()) setLoading(false);
    };
    checkAuth();
    return () => { cancelled = true; };
  }, [token, retryCount]);

  const saveSession = ({ access_token, user: userData }) => {
    sessionVersion.current += 1;
    localStorage.setItem('token', access_token);
    localStorage.setItem('user', JSON.stringify(userData));
    setAuthError('');
    setLoading(true);
    setToken(access_token);
    setUser(userData);
    setRetryCount(n => n + 1);
    return userData;
  };

  const login = async (phoneNumber, password) => {
    const res = await api.post('/api/auth/login', {
      phone_number: phoneNumber,
      password: password,
    });
    return saveSession(res.data);
  };

  const register = async (phoneNumber, password, fullName) => {
    const res = await api.post('/api/auth/register', {
      phone_number: phoneNumber,
      password: password,
      full_name: fullName,
    });
    return saveSession(res.data);
  };

  const logout = () => {
    sessionVersion.current += 1;
    clearSession(localStorage);
    setAuthError('');
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    const version = sessionVersion.current;
    try {
      const res = await api.get('/api/auth/me');
      if (version === sessionVersion.current && res.data?.user) {
        setUser(res.data.user);
        localStorage.setItem('user', JSON.stringify(res.data.user));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const updateProfile = async (fullName, phoneNumber) => {
    const version = sessionVersion.current;
    const res = await api.put('/api/auth/profile', {
      full_name: fullName,
      phone_number: phoneNumber,
    });
    if (version !== sessionVersion.current) return res.data;
    const { access_token, user: userData } = res.data;
    if (access_token) {
      localStorage.setItem('token', access_token);
      setToken(access_token);
    }
    if (userData) {
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
    }
    return res.data;
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, authError, retryAuth: () => setRetryCount(n => n + 1), login, register, logout, refreshUser, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
