import { SyncQueueItem, Unit } from '../types'
import { authService } from './auth'
import { storageService } from './storage'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'

export interface SyncStatus {
  isOnline: boolean
  isSyncing: boolean
  lastSyncAt: Date | null
  pendingItems: number
  failedItems: number
  immediateSyncPending: boolean
}

class SyncService {
  private syncStatus: SyncStatus = {
    isOnline: navigator.onLine,
    isSyncing: false,
    lastSyncAt: null,
    pendingItems: 0,
    failedItems: 0,
    immediateSyncPending: false,
  }

  private listeners: ((status: SyncStatus) => void)[] = []
  private syncInterval: number | null = null
  private retryTimeout: number | null = null
  private immediateSyncTimeout: number | null = null

  constructor() {
    this.setupOnlineListeners()
    this.startPeriodicSync()
  }

  private setupOnlineListeners() {
    window.addEventListener('online', this.handleOnline.bind(this))
    window.addEventListener('offline', this.handleOffline.bind(this))
  }

  private handleOnline() {
    console.log('Device came online')
    this.updateSyncStatus({ isOnline: true })
    this.triggerSync()
  }

  private handleOffline() {
    console.log('Device went offline')
    this.updateSyncStatus({ isOnline: false })
  }

  private updateSyncStatus(newStatus: Partial<SyncStatus>) {
    this.syncStatus = { ...this.syncStatus, ...newStatus }
    this.listeners.forEach(listener => listener(this.syncStatus))
  }

  private startPeriodicSync() {
    // Sync every 2 minutes as backup (reduced from 30 seconds since we have immediate sync)
    this.syncInterval = window.setInterval(() => {
      if (this.syncStatus.isOnline && authService.getAuthState().isAuthenticated) {
        this.triggerSync()
      }
    }, 120000) // 2 minutes
  }

  // New method for immediate sync with debouncing
  triggerImmediateSync(): void {
    // Clear any existing immediate sync timeout
    if (this.immediateSyncTimeout) {
      clearTimeout(this.immediateSyncTimeout)
    }

    // Set immediate sync pending status
    this.updateSyncStatus({ immediateSyncPending: true })

    // Debounce immediate syncs to avoid too many requests
    // Wait 2 seconds after the last change before syncing
    this.immediateSyncTimeout = window.setTimeout(() => {
      console.log('Immediate sync triggered after local change')
      this.updateSyncStatus({ immediateSyncPending: false })
      this.triggerSync()
    }, 2000)
  }

  async triggerSync(): Promise<void> {
    if (!this.syncStatus.isOnline || this.syncStatus.isSyncing) {
      return
    }

    const authState = authService.getAuthState()
    if (!authState.isAuthenticated) {
      console.log('Not authenticated, skipping sync')
      return
    }

    try {
      this.updateSyncStatus({
        isSyncing: true,
        immediateSyncPending: false, // Clear immediate sync pending when actual sync starts
      })

      // Step 1: Sync up (upload local changes to server)
      const syncQueue = await storageService.getSyncQueue()
      let processedCount = 0
      let failedCount = 0

      if (syncQueue.length > 0) {
        console.log(`Syncing up ${syncQueue.length} items...`)
        this.updateSyncStatus({ pendingItems: syncQueue.length })

        // Process sync items in batches
        const batchSize = 10

        for (let i = 0; i < syncQueue.length; i += batchSize) {
          const batch = syncQueue.slice(i, i + batchSize)

          try {
            const result = await this.syncBatch(batch, authState.token!)
            processedCount += result.processed
            failedCount += result.failed.length

            // Remove successfully processed items from queue
            await this.removeProcessedItems(batch, result.failed)
          } catch (error) {
            console.error('Batch sync failed:', error)
            failedCount += batch.length

            // Increment retry count for failed items
            await this.incrementRetryCount(batch)
          }
        }
      }

      // Step 2: Sync down (download server data to local)
      console.log('Syncing down units from server...')
      await this.syncDownUnits(authState.token!)

      this.updateSyncStatus({
        isSyncing: false,
        lastSyncAt: new Date(),
        pendingItems: Math.max(0, syncQueue.length - processedCount),
        failedItems: failedCount,
      })

      console.log(`Sync completed: ${processedCount} uploaded, ${failedCount} failed`)

      // Schedule retry for failed items
      if (failedCount > 0) {
        this.scheduleRetry()
      }
    } catch (error) {
      console.error('Sync error:', error)
      this.updateSyncStatus({
        isSyncing: false,
        immediateSyncPending: false,
      })
      this.scheduleRetry()
    }
  }

  private async syncBatch(items: SyncQueueItem[], token: string) {
    // Debug: Log what we're sending to the server
    console.log(`Syncing batch of ${items.length} items:`)
    items.forEach(item => {
      if (item.type === 'unit') {
        const unitData = item.data as Unit
        console.log(
          `  ${item.action} unit "${unitData.name}" with ${unitData.steps?.length || 0} steps`
        )
        if (unitData.steps && unitData.steps.length > 0) {
          unitData.steps.forEach((step, index) => {
            console.log(
              `    Step ${index + 1}: "${step.description}" with ${step.photos?.length || 0} photos`
            )
            // Check if photos have data
            if (step.photos && step.photos.length > 0) {
              step.photos.forEach((photo, photoIndex) => {
                const dataSize = photo.opfsPath ? photo.opfsPath.length : 0
                console.log(
                  `      Photo ${photoIndex + 1}: ${dataSize} chars (${Math.round(dataSize / 1024)}KB)`
                )
              })
            }
          })
        }
      }
    })

    const response = await fetch(`${API_BASE_URL}/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ items }),
    })

    if (!response.ok) {
      throw new Error(`Sync request failed: ${response.status}`)
    }

    const result = await response.json()
    if (!result.success) {
      throw new Error(result.error || 'Sync failed')
    }

    console.log(
      `Sync batch result: ${result.data.processed} processed, ${result.data.failed.length} failed`
    )
    if (result.data.failed.length > 0) {
      console.log('Failed items:', result.data.failed)
    }

    return result.data
  }

  private async removeProcessedItems(batch: SyncQueueItem[], failed: any[]) {
    const failedIds = new Set(failed.map(f => f.item.id))
    const successfulItems = batch.filter(item => !failedIds.has(item.id))

    // Remove successful items from sync queue and update their sync status
    for (const item of successfulItems) {
      await this.removeFromSyncQueue(item.id)

      // Update the unit's sync status to 'synced'
      if (item.type === 'unit' && (item.action === 'create' || item.action === 'update')) {
        const unitData = item.data as Unit
        await storageService.updateUnitSyncStatus(unitData.id, 'synced')
      }
    }
  }

  private async incrementRetryCount(items: SyncQueueItem[]) {
    for (const item of items) {
      if (item.retryCount < 3) {
        // Max 3 retries
        await storageService.updateSyncQueueItem({
          ...item,
          retryCount: item.retryCount + 1,
        })
      } else {
        // Remove items that have exceeded retry limit
        await this.removeFromSyncQueue(item.id)
      }
    }
  }

  private async removeFromSyncQueue(itemId: string) {
    await storageService.removeSyncQueueItem(itemId)
  }

  private async syncDownUnits(token: string): Promise<void> {
    try {
      // Fetch all user units from the server
      const response = await fetch(`${API_BASE_URL}/units?scope=user&limit=100`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch units: ${response.status}`)
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch units')
      }

      const serverUnits: Unit[] = result.data.units
      console.log(`Downloaded ${serverUnits.length} units from server`)

      // Debug: Log step data for each unit
      serverUnits.forEach(unit => {
        console.log(`Unit "${unit.name}" has ${unit.steps?.length || 0} steps:`, unit.steps)
        if (unit.steps && unit.steps.length > 0) {
          unit.steps.forEach((step, index) => {
            console.log(
              `  Step ${index + 1}: "${step.description}" with ${step.photos?.length || 0} photos`
            )
          })
        }
      })

      // Get local units
      const localUnits = await storageService.getAllUnits()
      const localUnitsMap = new Map(localUnits.map(unit => [unit.id, unit]))

      let mergedCount = 0
      let updatedCount = 0

      for (const serverUnit of serverUnits) {
        // Convert date strings to Date objects for unit and nested data
        const normalizedServerUnit: Unit = {
          ...serverUnit,
          createdAt: new Date(serverUnit.createdAt),
          updatedAt: new Date(serverUnit.updatedAt),
          lastSyncAt: serverUnit.lastSyncAt ? new Date(serverUnit.lastSyncAt) : undefined,
          // Convert step dates
          steps: serverUnit.steps.map(step => ({
            ...step,
            timestamp: new Date(step.timestamp),
            // Convert photo dates within each step
            photos: step.photos.map(photo => ({
              ...photo,
              timestamp: new Date(photo.timestamp),
            })),
          })),
          syncStatus: 'synced' as const,
        }

        const localUnit = localUnitsMap.get(serverUnit.id)

        if (!localUnit) {
          // Unit doesn't exist locally, add it
          console.log(
            `Adding new unit "${serverUnit.name}" with ${serverUnit.steps?.length || 0} steps`
          )
          await storageService.saveUnitToStorage(normalizedServerUnit)
          mergedCount++
        } else {
          // Unit exists locally, check if server version is newer
          const serverUpdatedAt = new Date(serverUnit.updatedAt)
          const localUpdatedAt = new Date(localUnit.updatedAt)

          if (serverUpdatedAt > localUpdatedAt) {
            // Server version is newer, update local
            console.log(
              `Updating unit "${serverUnit.name}" - server version newer (${serverUpdatedAt} > ${localUpdatedAt})`
            )
            console.log(
              `  Server unit has ${serverUnit.steps?.length || 0} steps, local had ${localUnit.steps?.length || 0} steps`
            )
            await storageService.saveUnitToStorage(normalizedServerUnit)
            updatedCount++
          } else {
            console.log(
              `Keeping local version of "${serverUnit.name}" - local version newer or same`
            )
          }
          // If local version is newer or same, keep local version
        }
      }

      console.log(`Sync down completed: ${mergedCount} new units, ${updatedCount} updated units`)
    } catch (error) {
      console.error('Error syncing down units:', error)
      // Don't throw here, as we don't want sync-down errors to break the entire sync
    }
  }

  private scheduleRetry() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout)
    }

    // Exponential backoff: retry after 1 minute, then 2, then 4, etc.
    const retryDelay = Math.min(60000 * Math.pow(2, this.syncStatus.failedItems), 300000) // Max 5 minutes

    this.retryTimeout = window.setTimeout(() => {
      console.log('Retrying failed sync items...')
      this.triggerSync()
    }, retryDelay)
  }

  async forcSync(): Promise<void> {
    console.log('Force sync triggered')
    await this.triggerSync()
  }

  async initialSync(): Promise<void> {
    console.log('Initial sync triggered (login)')
    // Force a sync immediately when user logs in to get their data
    await this.triggerSync()
  }

  getSyncStatus(): SyncStatus {
    return { ...this.syncStatus }
  }

  subscribe(listener: (status: SyncStatus) => void): () => void {
    this.listeners.push(listener)
    return () => {
      const index = this.listeners.indexOf(listener)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  destroy() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
    }
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout)
    }
    if (this.immediateSyncTimeout) {
      clearTimeout(this.immediateSyncTimeout)
    }
    window.removeEventListener('online', this.handleOnline.bind(this))
    window.removeEventListener('offline', this.handleOffline.bind(this))
  }
}

export const syncService = new SyncService()
