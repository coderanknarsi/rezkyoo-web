// lib/user-profile.ts
// Helper functions for managing user profiles in Firestore

import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore"
import { db } from "./firebase"

export interface UserProfile {
    uid: string
    email: string | null
    displayName: string | null
    phoneNumber: string | null
    smsNotifications: boolean
    createdAt: Date
    updatedAt: Date
}

/**
 * Get user profile from Firestore
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
    try {
        if (!db) {
            console.warn("Firestore not initialized")
            return null
        }
        const docRef = doc(db, "users", uid)
        const docSnap = await getDoc(docRef)

        if (docSnap.exists()) {
            return docSnap.data() as UserProfile
        }
        return null
    } catch (error) {
        console.error("Error fetching user profile:", error)
        return null
    }
}

/**
 * Create or update user profile in Firestore
 */
export async function saveUserProfile(
    uid: string,
    data: Partial<UserProfile>
): Promise<void> {
    try {
        if (!db) {
            console.warn("Firestore not initialized")
            return
        }
        const docRef = doc(db, "users", uid)
        const docSnap = await getDoc(docRef)

        if (docSnap.exists()) {
            // Update existing profile
            await updateDoc(docRef, {
                ...data,
                updatedAt: new Date(),
            })
        } else {
            // Create new profile
            await setDoc(docRef, {
                uid,
                email: data.email || null,
                displayName: data.displayName || null,
                phoneNumber: data.phoneNumber || null,
                smsNotifications: data.smsNotifications ?? true,
                createdAt: new Date(),
                updatedAt: new Date(),
                ...data,
            })
        }
    } catch (error) {
        console.error("Error saving user profile:", error)
        throw error
    }
}

/**
 * Update just the phone number
 */
export async function updatePhoneNumber(uid: string, phoneNumber: string): Promise<void> {
    return saveUserProfile(uid, { phoneNumber })
}

/**
 * Format phone number to US format for display
 */
export function formatPhoneNumber(phone: string): string {
    const cleaned = phone.replace(/\D/g, "")
    if (cleaned.length === 10) {
        return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
    }
    if (cleaned.length === 11 && cleaned.startsWith("1")) {
        return `(${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`
    }
    return phone
}

/**
 * Validate US phone number
 */
export function isValidPhoneNumber(phone: string): boolean {
    const cleaned = phone.replace(/\D/g, "")
    return cleaned.length === 10 || (cleaned.length === 11 && cleaned.startsWith("1"))
}

/**
 * Convert phone to E.164 format for Telnyx/SMS
 */
export function toE164(phone: string): string | null {
    const cleaned = phone.replace(/\D/g, "")
    if (cleaned.length === 10) {
        return `+1${cleaned}`
    }
    if (cleaned.length === 11 && cleaned.startsWith("1")) {
        return `+${cleaned}`
    }
    return null
}
