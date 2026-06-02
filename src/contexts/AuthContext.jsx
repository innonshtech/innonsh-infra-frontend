import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);

  // Rehydrate from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const storedCompany = localStorage.getItem('company');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
        if (storedCompany) setCompany(JSON.parse(storedCompany));
      } catch {
        localStorage.clear();
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await authService.login({ email, password });
    const result = data.data || data;

    // The backend now returns the real role! 
    // We map it to a flat string for easy checking across the app.
    if (result.user?.role?.name) {
      result.user.role = result.user.role.name;
    }

    localStorage.setItem('accessToken', result.accessToken);
    localStorage.setItem('refreshToken', result.refreshToken);
    localStorage.setItem('user', JSON.stringify(result.user));
    if (result.user?.company) {
      // Setup default active subscription for demo
      const comp = { ...result.user.company, status: 'ACTIVE', subscriptionStatus: 'ACTIVE' };
      localStorage.setItem('company', JSON.stringify(comp));
      setCompany(comp);
    }
    setUser(result.user);
    return result;
  }, []);

  const register = useCallback(async (formData) => {
    const { data } = await authService.register(formData);
    const result = data.data || data;
    if (result.user?.role?.name) {
      result.user.role = result.user.role.name;
    }

    localStorage.setItem('accessToken', result.accessToken || 'demo-token');
    localStorage.setItem('refreshToken', result.refreshToken || 'demo-refresh');
    localStorage.setItem('user', JSON.stringify(result.user));
    if (result.company) {
      const comp = { ...result.company, status: 'PENDING', subscriptionStatus: 'ACTIVE' };
      localStorage.setItem('company', JSON.stringify(comp));
      setCompany(comp);
    }
    setUser(result.user);
    return result;
  }, []);

  const logout = useCallback(async () => {
    try { await authService.logout(); } catch {}
    localStorage.clear();
    setUser(null);
    setCompany(null);
  }, []);

  const erpType = company?.erpType || user?.company?.erpType || 'CONTRACTOR';

  const hasPermission = useCallback((permission) => {
    // If no user, no access
    if (!user) return false;
    
    // Support robust case-insensitive check for all administrative roles
    const r = typeof user.role === 'string' ? user.role.toLowerCase() : (user.role?.name || '').toLowerCase();
    if (r === 'owner' || r === 'admin' || r === 'contractor' || r === 'builder') return true;
    
    // Check if the specific permission exists in the user's permissions array
    const userPermissions = user.permissions || [];
    return userPermissions.includes(permission);
  }, [user]);

  const value = {
    user,
    company,
    erpType,
    isAuthenticated: !!user,
    loading,
    login,
    register,
    logout,
    hasPermission,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}

// ─── Permission Wrapper Component ─────────────────────────────────────────
export function HasPermission({ required, children, fallback = null }) {
  const { hasPermission, loading } = useAuth();
  
  if (loading) return null;
  
  if (hasPermission(required)) {
    return <>{children}</>;
  }
  
  return fallback;
}
