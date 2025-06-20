import { APIGatewayProxyHandler } from 'aws-lambda';
import { requireAuth } from '../utils/auth';
import { getUserUnits } from '../services/dynamodb';
import { successResponse, errorResponse, serverErrorResponse, unauthorizedResponse } from '../utils/response';
import { SyncDataRequest, SyncDataResponse } from '../types';

export const syncData: APIGatewayProxyHandler = async (event) => {
  try {
    const authHeader = event.headers.Authorization || event.headers.authorization;
    const authUser = await requireAuth(authHeader);

    const body = JSON.parse(event.body || '{}');
    const syncRequest: SyncDataRequest = body;

    if (!syncRequest.items || !Array.isArray(syncRequest.items)) {
      return errorResponse('Invalid sync request format');
    }

    const processed = 0;
    const failed: SyncDataResponse['failed'] = [];

    // Process sync items
    // This is a simplified implementation - in production, you'd want more sophisticated
    // conflict resolution and batch processing
    for (const item of syncRequest.items) {
      try {
        // Process each sync item based on type and action
        switch (item.type) {
          case 'unit':
            // Handle unit sync
            break;
          case 'step':
            // Handle step sync
            break;
          case 'photo':
            // Handle photo sync
            break;
          default:
            throw new Error(`Unknown sync item type: ${item.type}`);
        }
      } catch (error) {
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