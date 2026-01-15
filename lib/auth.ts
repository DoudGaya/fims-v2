import { auth } from './firebase-admin';
import prisma from './prisma';
import { DecodedIdToken } from 'firebase-admin/auth';
import { User } from '@prisma/client';

export const verifyToken = async (token: string): Promise<DecodedIdToken> => {
  try {
    // console.log('Verifying Firebase token...');
    
    if (!token) {
      throw new Error('No token provided');
    }
    
    const decodedToken = await auth.verifyIdToken(token);
    // console.log('Token verification successful', decodedToken.uid);
    
    return decodedToken;
  } catch (error: any) {
    console.error('Token verification failed:', error.message);
    
    if (error.code === 'auth/id-token-expired') {
      throw new Error('Token expired');
    } else if (error.code === 'auth/argument-error') {
      throw new Error('Invalid token format');
    } else {
      throw new Error('Invalid token');
    }
  }
};

// Helper function to ensure user exists in database
export const ensureUserExists = async (firebaseUser: DecodedIdToken): Promise<User> => {
  try {
    // console.log('Ensuring user exists for UID:', firebaseUser.uid);
    
    // Check if user already exists
    let user = await prisma.user.findUnique({
      where: { id: firebaseUser.uid },
    });

    if (!user) {
      console.log('User not found in database, creating new user...');
      
      // Create user if it doesn't exist
      user = await prisma.user.create({
        data: {
          id: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: firebaseUser.name || firebaseUser.email?.split('@')[0] || 'User',
          role: 'agent', // Default role
        },
      });
      console.log('User created successfully:', user.email);
    } else {
      // console.log('User found in database:', user.email);
      
      // Update user info if needed (optional)
      if (firebaseUser.email && (user.email !== firebaseUser.email || user.displayName !== firebaseUser.name)) {
        // console.log('Updating user info...');
        user = await prisma.user.update({
          where: { id: firebaseUser.uid },
          data: {
            email: firebaseUser.email,
            displayName: firebaseUser.name || user.displayName,
          },
        });
      }
    }

    return user;
  } catch (error: any) {
    console.error('Error ensuring user exists:', error);
    // If user creation fails due to unique constraint (race condition), try to find the user again
    if (error.code === 'P2002') {
      console.log('Unique constraint error, trying to find user again...');
      const existingUser = await prisma.user.findUnique({
        where: { id: firebaseUser.uid },
      });
      if (existingUser) {
        return existingUser;
      }
    }
    throw error;
  }
};
