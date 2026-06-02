import React, { createContext, useContext, useState, useEffect } from 'react';
import adminClient from '../api/adminClient';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'super_admin' | 'finance_admin' | 'moderation_admin' | 'support_admin';
}

interface AdminAuthContextType {
  admin: AdminUser | null;
  adminToken: string | null;
  adminLoading: boolean;
  adminLogin: (token: string, user: AdminUser) => void;
  adminLogout: () => void;
  refreshAdmin: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [admin, setAdmin] = useState<AdminUser | null>(() => {
    const raw = localStorage.getItem('dee_admin_user');
    if (raw) {
      try { return JSON.parse(raw); } catch { return null; }
    }
    return null;
  });
  const [adminToken, setAdminToken] = useState<string | null>(localStorage.getItem('dee_admin_token'));
  const [adminLoading, setAdminLoading] = useState(true);

  const adminLogin = (token: string, adminUser: AdminUser) => {
    localStorage.setItem('dee_admin_token', token);
    localStorage.setItem('dee_admin_user', JSON.stringify(adminUser));
    setAdminToken(token);
    setAdmin(adminUser);
  };

  const adminLogout = () => {
    localStorage.removeItem('dee_admin_token');
    localStorage.removeItem('dee_admin_user');
    setAdminToken(null);
    setAdmin(null);
  };

  const refreshAdmin = async () => {
    if (!adminToken) {
      setAdminLoading(false);
      return;
    }
    try {
      const response = await adminClient.get('/api/admin/auth/me');
      if (response?.data?.admin) {
        const refreshedUser = response.data.admin;
        setAdmin(refreshedUser);
        localStorage.setItem('dee_admin_user', JSON.stringify(refreshedUser));
      }
    } catch (error) {
      console.error('Failed to verify administrative authorization status:', error);
      adminLogout();
    } finally {
      setAdminLoading(false);
    }
  };

  useEffect(() => {
    refreshAdmin();
  }, [adminToken]);

  return (
    <AdminAuthContext.Provider value={{ admin, adminToken, adminLoading, adminLogin, adminLogout, refreshAdmin }}>
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};
