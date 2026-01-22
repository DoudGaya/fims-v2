import admin from 'firebase-admin';

interface FirebaseServiceAccount extends admin.ServiceAccount {
  project_id?: string;
  private_key_id?: string;
  private_key?: string;
  client_email?: string;
  client_id?: string;
  auth_uri?: string;
  token_uri?: string;
  auth_provider_x509_cert_url?: string;
  client_x509_cert_url?: string;
}

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  const serviceAccount: FirebaseServiceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  };

  // Optional: Add other fields if strictly required by your setup, 
  // but usually projectId, privateKey, and clientEmail are sufficient for admin SDK.
  
  console.log('Initializing Firebase Admin with project ID:', process.env.FIREBASE_PROJECT_ID || 'undefined');
  
  try {
    if (serviceAccount.projectId && serviceAccount.clientEmail && serviceAccount.privateKey) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.FIREBASE_DATABASE_URL
      });
      console.log('Firebase Admin initialized successfully');
    } else {
      console.warn('Firebase Admin initialization skipped: Missing credentials (normal during build)');
    }
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
  }
}

// Export safely - prevents build crashes if credentials are missing
export const auth = admin.apps.length > 0 ? admin.auth() : {} as admin.auth.Auth;
export const firestore = admin.apps.length > 0 ? admin.firestore() : {} as admin.firestore.Firestore;

export const verifyFirebaseToken = async (token: string) => {
  if (!admin.apps.length) {
    throw new Error('Firebase Admin not initialized. Check environment variables.');
  }
  try {
    const instance = admin.auth();
    const decodedToken = await instance.verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    console.error('Error verifying Firebase token:', error);
    throw new Error('Invalid Firebase token');
  }
};

export default admin;
