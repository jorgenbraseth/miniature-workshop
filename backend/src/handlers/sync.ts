import { APIGatewayProxyHandler } from 'aws-lambda';
import { requireAuth } from '../utils/auth';
import { getUserUnits, getUnit, createUnit, updateUnit, deleteUnit } from '../services/dynamodb';
import { successResponse, errorResponse, serverErrorResponse, unauthorizedResponse } from '../utils/response';
import { SyncDataRequest, SyncDataResponse, Unit, SyncQueueItem } from '../types';

const handleUnitSync = async (item: SyncQueueItem, userId: string): Promise<void> => {
  const unitData = item.data as Unit;
  
  // Ensure the unit belongs to the authenticated user
  if (unitData.userId && unitData.userId !== userId) {
    throw new Error('Unauthorized: Unit does not belong to user');
  }

  switch (item.action) {
    case 'create':
      // Check if unit already exists
      const existingUnit = await getUnit(unitData.id);
      if (existingUnit) {
        // Unit exists, update it instead
        await updateUnit(unitData.id, {
          ...unitData,
          userId,
          syncStatus: 'synced',
          lastSyncAt: new Date().toISOString(),
        });
      } else {
        // Create new unit
        await createUnit({
          ...unitData,
          userId,
          syncStatus: 'synced',
        });
      }
      break;

    case 'update':
      await updateUnit(unitData.id, {
        ...unitData,
        userId,
        syncStatus: 'synced',
        lastSyncAt: new Date().toISOString(),
      });
      break;

    case 'delete':
      await deleteUnit(unitData.id);
      break;

    default:
      throw new Error(`Unknown sync action: ${item.action}`);
  }
};

export const syncData: APIGatewayProxyHandler = async (event) => {
  try {
    const authHeader = event.headers.Authorization || event.headers.authorization;
    const authUser = await requireAuth(authHeader);

    const body = JSON.parse(event.body || '{}');
    const syncRequest: SyncDataRequest = body;

    if (!syncRequest.items || !Array.isArray(syncRequest.items)) {
      return errorResponse('Invalid sync request format');
    }

    let processed = 0;
    const failed: SyncDataResponse['failed'] = [];

    // Process sync items
    for (const item of syncRequest.items) {
      try {
        // Process each sync item based on type and action
        switch (item.type) {
          case 'unit':
            await handleUnitSync(item, authUser.id);
            break;
          case 'step':
            // TODO: Implement step sync when step handlers are available
            console.log('Step sync not yet implemented:', item);
            break;
          case 'photo':
            // TODO: Implement photo sync when photo handlers are available
            console.log('Photo sync not yet implemented:', item);
            break;
          default:
            throw new Error(`Unknown sync item type: ${item.type}`);
        }
        processed++;
      } catch (error) {
        console.error('Failed to process sync item:', item, error);
        failed.push({
          item,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const response: SyncDataResponse = {
      processed,
      failed,
    };

    return successResponse(response, 'Sync completed');
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return unauthorizedResponse();
    }
    console.error('Error syncing data:', error);
    return serverErrorResponse();
  }
};

export const getSyncStatus: APIGatewayProxyHandler = async (event) => {
  try {
    const authHeader = event.headers.Authorization || event.headers.authorization;
    const authUser = await requireAuth(authHeader);

    // Get user's data to determine sync status
    const { units } = await getUserUnits(authUser.id);

    const syncStatus = {
      totalUnits: units.length,
      syncedUnits: units.filter(u => u.syncStatus === 'synced').length,
      localUnits: units.filter(u => u.syncStatus === 'local').length,
      syncingUnits: units.filter(u => u.syncStatus === 'syncing').length,
      conflictUnits: units.filter(u => u.syncStatus === 'conflict').length,
      lastSyncAt: Math.max(...units.map(u => u.lastSyncAt ? new Date(u.lastSyncAt).getTime() : 0)),
    };

    return successResponse(syncStatus, 'Sync status retrieved');
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return unauthorizedResponse();
    }
    console.error('Error getting sync status:', error);
    return serverErrorResponse();
  }
}; 