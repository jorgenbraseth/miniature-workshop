import { APIGatewayProxyHandler } from 'aws-lambda';
import { requireAuth, extractAuthUser } from '../utils/auth';
import { getUnit as getUnitFromDb, getUserUnits, getPublicUnits, createUnit as createUnitInDb, updateUnit as updateUnitInDb, deleteUnit as deleteUnitFromDb } from '../services/dynamodb';
import { successResponse, errorResponse, serverErrorResponse, unauthorizedResponse, notFoundResponse } from '../utils/response';
import { CreateUnitRequest, UpdateUnitRequest } from '../types';
import Joi from 'joi';

const createUnitSchema = Joi.object({
  name: Joi.string().required().min(1).max(100),
  description: Joi.string().required().min(1).max(500),
  gameSystem: Joi.string().required().min(1).max(50),
  faction: Joi.string().optional().max(50),
  modelCount: Joi.number().integer().min(1).max(100).required(),
  isPublic: Joi.boolean().required(),
});

const updateUnitSchema = Joi.object({
  name: Joi.string().optional().min(1).max(100),
  description: Joi.string().optional().min(1).max(500),
  gameSystem: Joi.string().optional().min(1).max(50),
  faction: Joi.string().optional().max(50),
  modelCount: Joi.number().integer().min(1).max(100).optional(),
  isComplete: Joi.boolean().optional(),
  thumbnailPhotoId: Joi.string().optional(),
  isPublic: Joi.boolean().optional(),
});

export const getUnits: APIGatewayProxyHandler = async (event) => {
  try {
    const authHeader = event.headers.Authorization || event.headers.authorization;
    const authUser = await extractAuthUser(authHeader);
    
    const queryParams = event.queryStringParameters || {};
    const limit = parseInt(queryParams.limit || '50');
    const nextToken = queryParams.nextToken;
    
    let result;
    
    if (authUser && queryParams.scope === 'user') {
      // Get user's units (both public and private)
      result = await getUserUnits(authUser.id, limit, nextToken);
    } else {
      // Get public units only
      result = await getPublicUnits(limit, nextToken);
    }

    return successResponse({
      units: result.units,
      nextToken: result.nextToken,
      hasMore: !!result.nextToken,
    });
  } catch (error) {
    console.error('Error getting units:', error);
    return serverErrorResponse();
  }
};

export const getUnit: APIGatewayProxyHandler = async (event) => {
  try {
    const unitId = event.pathParameters?.id;
    if (!unitId) {
      return errorResponse('Unit ID is required');
    }

    const unit = await getUnitFromDb(unitId);
    if (!unit) {
      return notFoundResponse('Unit');
    }

    // Check if user can access this unit
    const authHeader = event.headers.Authorization || event.headers.authorization;
    const authUser = await extractAuthUser(authHeader);
    
    // Allow access if unit is public or user owns it
    if (!unit.isPublic && (!authUser || authUser.id !== unit.userId)) {
      return unauthorizedResponse('Access denied');
    }

    return successResponse(unit);
  } catch (error) {
    console.error('Error getting unit:', error);
    return serverErrorResponse();
  }
};

export const createUnit: APIGatewayProxyHandler = async (event) => {
  try {
    const authHeader = event.headers.Authorization || event.headers.authorization;
    const authUser = await requireAuth(authHeader);

    const body = JSON.parse(event.body || '{}');
    const { error, value } = createUnitSchema.validate(body);
    
    if (error) {
      return errorResponse('Validation failed', 400, error.details.map(d => d.message).join(', '));
    }

    const unitData: CreateUnitRequest = value;
    
    const unit = await createUnitInDb({
      ...unitData,
      userId: authUser.id,
      steps: [],
      isComplete: false,
      syncStatus: 'synced',
    });

    return successResponse(unit, 'Unit created successfully', 201);
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return unauthorizedResponse();
    }
    console.error('Error creating unit:', error);
    return serverErrorResponse();
  }
};

export const updateUnit: APIGatewayProxyHandler = async (event) => {
  try {
    const authHeader = event.headers.Authorization || event.headers.authorization;
    const authUser = await requireAuth(authHeader);

    const unitId = event.pathParameters?.id;
    if (!unitId) {
      return errorResponse('Unit ID is required');
    }

    // Check if unit exists and user owns it
    const existingUnit = await getUnitFromDb(unitId);
    if (!existingUnit) {
      return notFoundResponse('Unit');
    }

    if (existingUnit.userId !== authUser.id) {
      return unauthorizedResponse('Access denied');
    }

    const body = JSON.parse(event.body || '{}');
    const { error, value } = updateUnitSchema.validate(body);
    
    if (error) {
      return errorResponse('Validation failed', 400, error.details.map(d => d.message).join(', '));
    }

    const updates: UpdateUnitRequest = value;
    const updatedUnit = await updateUnitInDb(unitId, updates);

    return successResponse(updatedUnit, 'Unit updated successfully');
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return unauthorizedResponse();
    }
    console.error('Error updating unit:', error);
    return serverErrorResponse();
  }
};

export const deleteUnit: APIGatewayProxyHandler = async (event) => {
  try {
    const authHeader = event.headers.Authorization || event.headers.authorization;
    const authUser = await requireAuth(authHeader);

    const unitId = event.pathParameters?.id;
    if (!unitId) {
      return errorResponse('Unit ID is required');
    }

    // Check if unit exists and user owns it
    const existingUnit = await getUnitFromDb(unitId);
    if (!existingUnit) {
      return notFoundResponse('Unit');
    }

    if (existingUnit.userId !== authUser.id) {
      return unauthorizedResponse('Access denied');
    }

    await deleteUnitFromDb(unitId);

    return successResponse(null, 'Unit deleted successfully');
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return unauthorizedResponse();
    }
    console.error('Error deleting unit:', error);
    return serverErrorResponse();
  }
}; 