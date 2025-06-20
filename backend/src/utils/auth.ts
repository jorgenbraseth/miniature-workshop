import { OAuth2Client } from 'google-auth-library';
import { GoogleTokenPayload, AuthUser } from '../types';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const verifyGoogleToken = async (token: string): Promise<AuthUser | null> => {
  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload() as GoogleTokenPayload;
    
    if (!payload) {
      return null;
    }

    return {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      avatar: payload.picture,
    };
  } catch (error) {
    console.error('Error verifying Google token:', error);
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