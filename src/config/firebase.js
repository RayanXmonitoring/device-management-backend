const admin = require('firebase-admin');
const logger = require('../utils/logger');

let firebaseApp = null;

const initializeFirebase = () => {
  try {
    if (firebaseApp) {
      return firebaseApp;
    }

    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    };

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`,
    });

    logger.info('Firebase initialized successfully');
    return firebaseApp;
  } catch (error) {
    logger.error('Firebase initialization failed:', error);
    throw error;
  }
};

const getFirebaseAuth = () => {
  const app = initializeFirebase();
  return admin.auth(app);
};

const verifyFirebaseToken = async (token) => {
  try {
    const auth = getFirebaseAuth();
    const decodedToken = await auth.verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    logger.error('Firebase token verification failed:', error);
    throw error;
  }
};

const createFirebaseUser = async (email, password) => {
  try {
    const auth = getFirebaseAuth();
    const userRecord = await auth.createUser({
      email,
      password,
      emailVerified: false,
      disabled: false,
    });
    return userRecord;
  } catch (error) {
    logger.error('Firebase user creation failed:', error);
    throw error;
  }
};

const deleteFirebaseUser = async (uid) => {
  try {
    const auth = getFirebaseAuth();
    await auth.deleteUser(uid);
    logger.info(`Firebase user ${uid} deleted successfully`);
  } catch (error) {
    logger.error('Firebase user deletion failed:', error);
    throw error;
  }
};

module.exports = {
  initializeFirebase,
  getFirebaseAuth,
  verifyFirebaseToken,
  createFirebaseUser,
  deleteFirebaseUser,
};
