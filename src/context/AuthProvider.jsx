import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AuthContext } from './authContext';
import { authService } from '../api/authService';
import { userService } from '../api/userService';
import { tokenManager } from '../utils/tokenManager';
import { logError } from '../utils/errorUtils';
import { showWarning } from '../utils/toastUtils';

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  const tokenCheckIntervalRef = useRef(null);

  // Token süresi dolduğunda
  const handleTokenExpired = useCallback(() => {
    if (tokenCheckIntervalRef.current) {
      clearInterval(tokenCheckIntervalRef.current);
    }
    
    tokenManager.clear();
    setUser(null);
    setIsAuthenticated(false);

    if (!window.location.pathname.includes('/login')) {
      showWarning('Oturum süreniz doldu. Lütfen tekrar giriş yapın.', {
        autoClose: 6000,
        onClose: () => window.location.href = '/login'
      });
    }
  }, []);

  // Token süresini periyodik kontrol et
  const startTokenCheck = useCallback(() => {
    // Önceki interval'ı temizle
    if (tokenCheckIntervalRef.current) {
      clearInterval(tokenCheckIntervalRef.current);
    }

    tokenCheckIntervalRef.current = setInterval(() => {
      if (!tokenManager.isTokenValid()) {
        console.log('⏰ Token süresi doldu, otomatik çıkış yapılıyor...');
        handleTokenExpired();
      } else {
        const remainingMinutes = Math.floor(tokenManager.getTokenRemainingTime() / 60000);
        console.log(`⏱️ Token kalan süre: ${remainingMinutes} dakika`);
        
        if (remainingMinutes <= 60 && remainingMinutes > 0) {
          console.warn(`⚠️ Oturum süreniz ${remainingMinutes} dakika içinde dolacak!`);
        }
      }
    }, 1800000);
  }, [handleTokenExpired]);

  // Uygulama açıldığında token kontrolü
  useEffect(() => {
    const checkAuth = async () => {
      const isAuth = authService.isAuthenticated();
      
      if (isAuth) {
        const currentUser = authService.getCurrentUser();
        setUser(currentUser);
        setIsAuthenticated(true);
        
        startTokenCheck();
        
        try {
          const result = await userService.getProfile();
          if (result.success) {
            setUser((prev) => ({ ...prev, ...result.data }));
          }
        } catch (error) {
          logError('Profil alınamadı', error);
          if (error.response?.status === 401 || error.response?.status === 403) {
            handleTokenExpired();
            return;
          }
        }
      } else {
        tokenManager.clear();
      }
      
      setLoading(false);
    };

    checkAuth();
    
    return () => {
      if (tokenCheckIntervalRef.current) {
        clearInterval(tokenCheckIntervalRef.current);
      }
    };
  }, [startTokenCheck, handleTokenExpired]);

  const login = async (email, password) => {
    const result = await authService.login(email, password);
    
    if (result.success) {
      setUser(result.data.user);
      setIsAuthenticated(true);
      startTokenCheck();
      return { success: true };
    }
    
    return { success: false, error: result.error };
  };

  const logout = () => {
    if (tokenCheckIntervalRef.current) {
      clearInterval(tokenCheckIntervalRef.current);
    }

    authService.logout();
    setUser(null);
    setIsAuthenticated(false);
  };

  const refreshUser = async () => {
    try {
      const result = await userService.getProfile();
      if (result.success) {
        setUser((prev) => ({ ...prev, ...result.data }));
      }
    } catch (error) {
      logError('Profil yenilenemedi', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}