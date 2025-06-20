import { OAuth2Client } from 'google-auth-library';
import { GoogleTokenPayload, AuthUser } from '../types';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const verifyGoogleToken = async (token: string): Promise<AuthUser | null> => {
  try {
    console.log('Verifying Google token with client ID:', process.env.GOOGLE_CLIENT_ID?.substring(0, 20) + '...');
    
    if (!process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID === 'not-set') {
      console.error('GOOGLE_CLIENT_ID is not properly configured');
      return null;
    }

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload() as GoogleTokenPayload;
    
    if (!payload) {
      console.error('No payload received from Google token verification');
      return null;
    }

    console.log('Google token payload received for user:', payload.email);

    return {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      avatar: payload.picture,
    };
  } catch (error) {
    console.error('Error verifying Google token:', error);
    console.error('Token length:', token?.length);
    console.error('Client ID configured:', !!process.env.GOOGLE_CLIENT_ID);
    return null;
  }
};

export const extractAuthUser = (authHeader?: string): Promise<AuthUser | null> => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return Promise.resolve(null);
  }

  const token = authHeader.substring(7);
  return verifyGoogleToken(token);
};

export const requireAuth = async (authHeader?: string): Promise<AuthUser> => {
  const user = await extractAuthUser(authHeader);
  if (!user) {
    throw new Error('Authentication required');
  }
  return user;
}; 