import { useState, useEffect } from 'preact/hooks';
import { ComponentChildren } from 'preact';
import { authService, AuthState } from '../services/auth';
import LoginButton from './LoginButton';

interface AuthGuardProps {
  children: ComponentChildren;
  fallback?: ComponentChildren;
}

export default function AuthGuard({ children, fallback }: AuthGuardProps) {
  const [authState, setAuthState] = useState<AuthState>(authService.getAuthState());

  useEffect(() => {
    const unsubscribe = authService.subscribe(setAuthState);
    return unsubscribe;
  }, []);

  if (authState.isLoading) {
    return (
      <div class="flex items-center justify-center min-h-64">
        <div class="text-center">
          <div class="loading-spinner h-8 w-8 mx-auto mb-4" />
          <p class="text-workshop-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!authState.isAuthenticated) {
    if (fallback) {
      return fallback;
    }

    return (
      <div class="flex items-center justify-center min-h-64">
        <div class="card max-w-md mx-4 text-center">
          <h2 class="text-xl font-bold text-workshop-900 mb-4">Sign In Required</h2>
          <p class="text-workshop-600 mb-6">
            You need to sign in to access this feature and sync your data to the cloud.
          </p>
          <LoginButton />
          <div class="mt-4 text-sm text-workshop-500">
            <p>Your data is stored locally until you sign in.</p>
          </div>
        </div>
      </div>
    );
  }

  return children;
} 