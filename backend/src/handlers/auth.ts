import { APIGatewayProxyHandler } from 'aws-lambda';
import { verifyGoogleToken, requireAuth } from '../utils/auth';
import { getUser, getUserByEmail, createUser } from '../services/dynamodb';
import { successResponse, errorResponse, serverErrorResponse, unauthorizedResponse } from '../utils/response';

export const handler: APIGatewayProxyHandler = async (event) => {
  const { httpMethod, path } = event;

  try {
    if (httpMethod === 'POST' && path === '/auth/verify') {
      return await verifyToken(event);
    }
    
    if (httpMethod === 'GET' && path === '/auth/user') {
      return await getCurrentUser(event);
    }

    return errorResponse('Route not found', 404);
  } catch (error) {
    console.error('Auth handler error:', error);
    return serverErrorResponse();
  }
};

const verifyToken = async (event: any) => {
  try {
    const body = JSON.parse(event.body || '{}');
    const { token } = body;

    if (!token) {
      return errorResponse('Token is required');
    }

    const authUser = await verifyGoogleToken(token);
    if (!authUser) {
      return unauthorizedResponse('Invalid token');
    }

    // Check if user exists in our database
    let user = await getUserByEmail(authUser.email);
    
    if (!user) {
      // Create new user
      user = await createUser({
        id: authUser.id,
        email: authUser.email,
        name: authUser.name,
        avatar: authUser.avatar,
      });
    }

    return successResponse({
      user,
      token, // Return the same token for frontend to store
    });
  } catch (error) {
    console.error('Error verifying token:', error);
    return serverErrorResponse('Failed to verify token');
  }
};

const getCurrentUser = async (event: any) => {
  try {
    const authHeader = event.headers.Authorization || event.headers.authorization;
    const authUser = await requireAuth(authHeader);
    
    const user = await getUser(authUser.id);
    if (!user) {
      return errorResponse('User not found', 404);
    }

    return successResponse(user);
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return unauthorizedResponse();
    }
    console.error('Error getting current user:', error);
    return serverErrorResponse('Failed to get user');
  }
}; 