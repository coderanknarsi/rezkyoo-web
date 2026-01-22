import { initializeApp, getApps, cert, App } from "firebase-admin/app"
import { getFirestore, Firestore } from "firebase-admin/firestore"

/**
 * Firebase Admin SDK for server-side operations
 * Uses service account credentials for secure access
 */

let adminApp: App | null = null
let adminDb: Firestore | null = null

function initializeAdmin() {
    if (getApps().length > 0) {
        adminApp = getApps()[0]
    } else {
        // Use environment variable for service account or default credentials
        const serviceAccount = process.env.GOOGLE_APPLICATION_CREDENTIALS
            ? undefined // Will use default credentials from env
            : {
                projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
            }

        adminApp = initializeApp(
            serviceAccount
                ? { credential: cert(serviceAccount as any) }
                : { projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID }
        )
    }

    adminDb = getFirestore(adminApp)
    return { adminApp, adminDb }
}

// Initialize on first import
if (!adminApp) {
    try {
        initializeAdmin()
    } catch (error) {
        console.error("Failed to initialize Firebase Admin:", error)
    }
}

export { adminApp, adminDb }
