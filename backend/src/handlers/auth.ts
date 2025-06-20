import { APIGatewayProxyHandler } from 'aws-lambda';
import { verifyGoogleToken, requireAuth } from '../utils/auth';
import { getUser, getUserByEmail, createUser } from '../services/dynamodb';
import { successResponse, errorResponse, serverErrorResponse, unauthorizedResponse } from '../utils/response';

// Export individual handlers for each endpoint
export const verifyToken: APIGatewayProxyHandler = async (event) => {
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

export const getCurrentUser: APIGatewayProxyHandler = async (event) => {
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

 