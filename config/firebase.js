// firebase-admin v11+ uses sub-package imports — admin.credential no longer exists
// on the default export. Use named exports from 'firebase-admin/app' instead.
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

// Ensure that we have the necessary environment variables
if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
    console.warn("Firebase Admin SDK warning: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, or FIREBASE_PRIVATE_KEY is missing from .env");
}

let adminAuth;

try {
    // Reformat the private key — .env stores \n as a literal backslash-n, so replace it
    const privateKey = process.env.FIREBASE_PRIVATE_KEY
        ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        : undefined;

    // Avoid re-initializing if already done (e.g. hot-reload with nodemon)
    const app = getApps().length === 0
        ? initializeApp({
            credential: cert({
                projectId:   process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey:  privateKey,
            }),
        })
        : getApps()[0];

    adminAuth = getAuth(app);
    console.log("Firebase Admin SDK initialized successfully.");
} catch (error) {
    console.error("Firebase Admin SDK initialization error:", error);
}

module.exports = { adminAuth };
