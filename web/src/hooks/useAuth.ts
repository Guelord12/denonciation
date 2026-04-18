import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export function useAuth() {
  const { user, isAuthenticated, isLoading, login, register, logout } = useAuthStore();
  const navigate = useNavigate();

  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
  };
}

export function useRequireAuth(redirectTo = '/login') {
  const { isAuthenticated, isLoading } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate(redirectTo);
    }
  }, [isAuthenticated, isLoading, navigate, redirectTo]);

  return { isAuthenticated, isLoading };
}

export function useRequireAdmin(redirectTo = '/dashboard') {
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && isAuthenticated && !user?.is_admin) {
      navigate(redirectTo);
    }
  }, [user, isAuthenticated, isLoading, navigate, redirectTo]);

  return { isAdmin: user?.is_admin, isLoading };
}