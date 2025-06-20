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
    console.log('Auth verify request received');
    console.log('Event body:', event.body);
    console.log('GOOGLE_CLIENT_ID configured:', !!process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_ID !== 'not-set');
    
    const body = JSON.parse(event.body || '{}');
    const { token } = body;

    if (!token) {
      console.log('No token provided in request');
      return errorResponse('Token is required');
    }

    console.log('Verifying Google token...');
    const authUser = await verifyGoogleToken(token);
    if (!authUser) {
      console.log('Google token verification failed');
      return unauthorizedResponse('Invalid token');
    }

    console.log('Google token verified for user:', authUser.email);

    // Check if user exists in our database
    console.log('Looking up user by email:', authUser.email);
    let user = await getUserByEmail(authUser.email);
    
    if (!user) {
      console.log('User not found, creating new user');
      // Create new user
      user = await createUser({
        id: authUser.id,
        email: authUser.email,
        name: authUser.name,
        avatar: authUser.avatar,
      });
      console.log('New user created:', user.id);
    } else {
      console.log('Existing user found:', user.id);
    }

    console.log('Auth verification successful');
    return successResponse({
      user,
      token, // Return the same token for frontend to store
    });
  } catch (error) {
    console.error('Error verifying token:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
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