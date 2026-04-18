import { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../stores/authStore';

export function useAuth() {
  const { user, isAuthenticated, isLoading, login, register, logout } = useAuthStore();

  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
  };
}

export function useRequireAuth(redirectTo = 'Login') {
  const { isAuthenticated, isLoading } = useAuthStore();
  const navigation = useNavigation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigation.navigate(redirectTo as never);
    }
  }, [isAuthenticated, isLoading, navigation, redirectTo]);

  return { isAuthenticated, isLoading };
}