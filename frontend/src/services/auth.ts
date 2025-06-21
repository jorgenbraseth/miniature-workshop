import { User } from '../types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

export interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
}

class AuthService {
  private authState: AuthState = {
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
  }

  private listeners: ((state: AuthState) => void)[] = []

  constructor() {
    this.loadFromStorage()
    this.initializeGoogleAuth()
  }

  private loadFromStorage() {
    const token = localStorage.getItem('auth_token')
    const userStr = localStorage.getItem('auth_user')

    if (token && userStr) {
      try {
        const user = JSON.parse(userStr)
        this.authState = {
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
        }
      } catch (error) {
        console.error('Failed to parse stored user data:', error)
        this.clearStorage()
      }
    }
  }

  private clearStorage() {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_user')
  }

  private saveToStorage(user: User, token: string) {
    localStorage.setItem('auth_token', token)
    localStorage.setItem('auth_user', JSON.stringify(user))
  }

  private updateAuthState(newState: Partial<AuthState>) {
    this.authState = { ...this.authState, ...newState }
    this.listeners.forEach(listener => listener(this.authState))
  }

  private async initializeGoogleAuth() {
    if (!GOOGLE_CLIENT_ID) {
      console.error('Google Client ID not configured')
      return
    }

    try {
      // Load Google Identity Services
      await this.loadGoogleScript()

      // Initialize Google Auth
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: this.handleGoogleCallback.bind(this),
      })
    } catch (error) {
      console.error('Failed to initialize Google Auth:', error)
    }
  }

  private loadGoogleScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (window.google) {
        resolve()
        return
      }

      const script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('Failed to load Google Identity Services'))
      document.head.appendChild(script)
    })
  }

  private async handleGoogleCallback(response: any) {
    try {
      this.updateAuthState({ isLoading: true })

      const result = await fetch(`${API_BASE_URL}/auth/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: response.credential }),
      })

      if (!result.ok) {
        throw new Error('Authentication failed')
      }

      const data = await result.json()

      if (data.success) {
        this.saveToStorage(data.data.user, data.data.token)
        this.updateAuthState({
          user: data.data.user,
          token: data.data.token,
          isAuthenticated: true,
          isLoading: false,
        })

        // Trigger initial sync to download user's data
        this.triggerInitialSync()
      } else {
        throw new Error(data.error || 'Authentication failed')
      }
    } catch (error) {
      console.error('Google authentication error:', error)
      this.updateAuthState({ isLoading: false })
      throw error
    }
  }

  async signInWithGoogle(): Promise<void> {
    if (!window.google) {
      throw new Error('Google Identity Services not loaded')
    }

    return new Promise((resolve, reject) => {
      window.google.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          // Fallback to popup
          window.google.accounts.id.renderButton(document.createElement('div'), {
            theme: 'outline',
            size: 'large',
          })
        }
      })

      // Set up a temporary callback to resolve/reject the promise
      const originalCallback = this.handleGoogleCallback.bind(this)
      this.handleGoogleCallback = async (response: any) => {
        try {
          await originalCallback(response)
          resolve()
        } catch (error) {
          reject(error)
        } finally {
          this.handleGoogleCallback = originalCallback
        }
      }
    })
  }

  async signOut(): Promise<void> {
    this.clearStorage()
    this.updateAuthState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    })

    if (window.google) {
      window.google.accounts.id.disableAutoSelect()
    }
  }

  async getCurrentUser(): Promise<User | null> {
    if (!this.authState.isAuthenticated || !this.authState.token) {
      return null
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/user`, {
        headers: {
          Authorization: `Bearer ${this.authState.token}`,
        },
      })

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired, sign out
          await this.signOut()
        }
        throw new Error('Failed to get current user')
      }

      const data = await response.json()
      return data.success ? data.data : null
    } catch (error) {
      console.error('Error getting current user:', error)
      return null
    }
  }

  getAuthState(): AuthState {
    return { ...this.authState }
  }

  getAuthHeader(): string | null {
    return this.authState.token ? `Bearer ${this.authState.token}` : null
  }

  private triggerInitialSync() {
    // Import syncService dynamically to avoid circular dependency
    import('./sync').then(({ syncService }) => {
      syncService.initialSync().catch(error => {
        console.error('Initial sync failed:', error)
      })
    })
  }

  subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.push(listener)
    return () => {
      const index = this.listeners.indexOf(listener)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }
}

// Global type declarations
declare global {
  interface Window {
    google: any
  }
}

export const authService = new AuthService()
