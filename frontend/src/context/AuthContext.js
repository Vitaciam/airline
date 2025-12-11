import React, { createContext, useState, useContext, useEffect } from 'react';
import { authAPI } from '../services/api';
import api from '../services/api';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUser();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUser = async () => {
    try {
      const response = await authAPI.me();
      setUser(response.data);
    } catch (error) {
      localStorage.removeItem('token');
      delete api.defaults.headers.common['Authorization'];
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const response = await authAPI.login(email, password);
    const { access_token, user } = response.data;
    
    // Проверяем, что токен получен
    if (!access_token) {
      throw new Error('Token not received from server');
    }
    
    // Сохраняем токен
    localStorage.setItem('token', access_token);
    api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
    setUser(user);
    
    console.log('Token saved to localStorage:', access_token.substring(0, 20) + '...');
    return response.data;
  };

  const register = async (userData) => {
    const response = await authAPI.register(userData);
    const { access_token, user } = response.data;
    localStorage.setItem('token', access_token);
    api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
    setUser(user);
    return response.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
  };

  const value = {
    user,
    login,
    register,
    logout,
    loading
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

