import { useState, useEffect } from 'preact/hooks'
import { authService, AuthState } from '../services/auth'

export default function LoginButton() {
  const [authState, setAuthState] = useState<AuthState>(authService.getAuthState())
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const unsubscribe = authService.subscribe(setAuthState)
    return unsubscribe
  }, [])

  const handleSignIn = async () => {
    try {
      setIsLoading(true)
      await authService.signInWithGoogle()
    } catch (error) {
      console.error('Sign in failed:', error)
      alert('Sign in failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignOut = async () => {
    try {
      setIsLoading(true)
      await authService.signOut()
    } catch (error) {
      console.error('Sign out failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (authState.isAuthenticated && authState.user) {
    return (
      <div class="flex items-center space-x-3">
        <div class="flex items-center space-x-2">
          {authState.user.avatar && (
            <img
              src={authState.user.avatar}
              alt={authState.user.name}
              class="w-8 h-8 rounded-full"
            />
          )}
          <span class="text-sm font-medium text-workshop-700">{authState.user.name}</span>
        </div>
        <button
          onClick={handleSignOut}
          disabled={isLoading}
          class="text-sm text-workshop-600 hover:text-workshop-900 transition-colors duration-200"
        >
          {isLoading ? 'Signing out...' : 'Sign out'}
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={handleSignIn}
      disabled={isLoading || authState.isLoading}
      class="btn-primary flex items-center space-x-2"
    >
      <svg class="w-4 h-4" viewBox="0 0 24 24">
        <path
          fill="currentColor"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="currentColor"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="currentColor"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="currentColor"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
      <span>{isLoading || authState.isLoading ? 'Signing in...' : 'Sign in with Google'}</span>
    </button>
  )
}
