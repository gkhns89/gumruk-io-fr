import React, { createContext, useState, useEffect } from 'react';
import { authService } from '../api/authService';
import { userService } from '../api/userService';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Uygulama açıldığında token kontrolü
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const isAuth = authService.isAuthenticated();
    
    if (isAuth) {
      const currentUser = authService.getCurrentUser();
      setUser(currentUser);
      setIsAuthenticated(true);
      
      // Profil bilgilerini güncelle
      const result = await userService.getProfile();
      if (result.success) {
        setUser((prev) => ({ ...prev, ...result.data }));
      }
    }
    
    setLoading(false);
  };

  const login = async (email, password) => {
    const result = await authService.login(email, password);
    
    if (result.success) {
      setUser(result.data.user);
      setIsAuthenticated(true);
      return { success: true };
    }
    
    return { success: false, error: result.error };
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};