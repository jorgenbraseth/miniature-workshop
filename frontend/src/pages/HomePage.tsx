import { route } from 'preact-router'
import { useEffect, useState } from 'preact/hooks'
import { storageService } from '../services/storage'
import { authService, AuthState } from '../services/auth'
import { syncService, SyncStatus } from '../services/sync'
import { StorageStats } from '../types'
import LoginButton from '../components/LoginButton'
import SyncStatusComponent from '../components/SyncStatus'

export default function HomePage() {
  const [stats, setStats] = useState<StorageStats | null>(null)
  const [authState, setAuthState] = useState<AuthState>(authService.getAuthState())
  const [, setSyncStatus] = useState<SyncStatus>(syncService.getSyncStatus())

  useEffect(() => {
    loadStats()

    const authUnsubscribe = authService.subscribe(setAuthState)
    const syncUnsubscribe = syncService.subscribe(setSyncStatus)

    return () => {
      authUnsubscribe()
      syncUnsubscribe()
    }
  }, [])

  const loadStats = async () => {
    try {
      const storageStats = await storageService.getStorageStats()
      setStats(storageStats)
    } catch (error) {
      console.error('Failed to load stats:', error)
    }
  }

  const formatStorageSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
  }

  return (
    <div class="max-w-4xl mx-auto">
      {/* Hero Section */}
      <div class="text-center mb-12">
        <h1 class="text-4xl font-bold text-gray-900 mb-4">Welcome to Miniature Workshop</h1>
        <p class="text-xl text-gray-600 mb-8">
          Document, track, and share your miniature painting journey
        </p>
        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <button onClick={() => route('/units/new')} class="btn-primary text-lg px-8 py-3">
            Start Your First Unit
          </button>
          <button onClick={() => route('/units')} class="btn-secondary text-lg px-8 py-3">
            View My Units
          </button>
        </div>

        {/* Sync Status for authenticated users */}
        {authState.isAuthenticated && (
          <div class="mt-6 p-4 bg-workshop-50 rounded-lg border border-workshop-200">
            <div class="flex items-center justify-center space-x-4">
              <span class="text-sm text-workshop-600">Sync Status:</span>
              <SyncStatusComponent />
            </div>
          </div>
        )}

        {/* Login prompt for unauthenticated users */}
        {!authState.isAuthenticated && (
          <div class="mt-6 p-6 bg-gradient-to-r from-paint-50 to-brush-50 rounded-lg border border-paint-200">
            <div class="text-center">
              <h3 class="text-lg font-semibold text-workshop-900 mb-2">☁️ Sync Your Data</h3>
              <p class="text-workshop-600 mb-4">
                Sign in to backup your work and sync across devices
              </p>
              <LoginButton />
            </div>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      {stats && (
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <div class="card text-center group hover:shadow-paint transition-all duration-300">
            <div class="text-4xl mb-2">📦</div>
            <div class="text-3xl font-bold text-paint-600 mb-2">{stats.totalUnits}</div>
            <div class="text-workshop-600 font-medium">Units</div>
          </div>
          <div class="card text-center group hover:shadow-paint transition-all duration-300">
            <div class="text-4xl mb-2">🎨</div>
            <div class="text-3xl font-bold text-paint-600 mb-2">{stats.totalSteps}</div>
            <div class="text-workshop-600 font-medium">Steps</div>
          </div>
          <div class="card text-center group hover:shadow-paint transition-all duration-300">
            <div class="text-4xl mb-2">📸</div>
            <div class="text-3xl font-bold text-paint-600 mb-2">{stats.totalPhotos}</div>
            <div class="text-workshop-600 font-medium">Photos</div>
          </div>
          <div class="card text-center group hover:shadow-paint transition-all duration-300">
            <div class="text-4xl mb-2">💾</div>
            <div class="text-3xl font-bold text-paint-600 mb-2">
              {formatStorageSize(stats.storageUsed)}
            </div>
            <div class="text-workshop-600 font-medium">Storage Used</div>
          </div>
        </div>
      )}

      {/* Features Section */}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <div class="card group hover:shadow-paint transition-all duration-300 hover:-translate-y-1">
          <div class="w-16 h-16 bg-gradient-to-br from-paint-100 to-paint-200 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
            <span class="text-3xl">📷</span>
          </div>
          <h3 class="text-lg font-semibold text-workshop-900 mb-2">Photo Documentation</h3>
          <p class="text-workshop-600">
            Capture high-quality images of your miniatures at each stage of the painting process.
          </p>
        </div>

        <div class="card group hover:shadow-paint transition-all duration-300 hover:-translate-y-1">
          <div class="w-16 h-16 bg-gradient-to-br from-brush-100 to-brush-200 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
            <span class="text-3xl">📝</span>
          </div>
          <h3 class="text-lg font-semibold text-workshop-900 mb-2">Detailed Notes</h3>
          <p class="text-workshop-600">
            Record paint mixes, techniques, and tips for each step to recreate your work later.
          </p>
        </div>

        <div class="card group hover:shadow-paint transition-all duration-300 hover:-translate-y-1">
          <div class="w-16 h-16 bg-gradient-to-br from-workshop-100 to-workshop-200 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
            <span class="text-3xl">🤝</span>
          </div>
          <h3 class="text-lg font-semibold text-workshop-900 mb-2">Community Sharing</h3>
          <p class="text-workshop-600">
            Share your painting guides with the community and learn from other painters.
          </p>
        </div>
      </div>
    </div>
  )
}
