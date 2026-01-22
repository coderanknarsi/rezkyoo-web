"use client"

import { db } from "@/lib/firebase"
import {
    collection,
    addDoc,
    query,
    where,
    orderBy,
    limit,
    getDocs,
    deleteDoc,
    doc,
    serverTimestamp,
    Timestamp,
} from "firebase/firestore"

export type SearchHistoryItem = {
    id: string
    userId: string
    cravingText: string
    location: string
    partySize?: number
    date?: string
    time?: string
    batchId: string
    createdAt: Date
}

/**
 * Save a search to the user's history
 */
export async function saveSearchToHistory(
    userId: string,
    data: {
        cravingText: string
        location: string
        partySize?: number
        date?: string
        time?: string
        batchId: string
    }
): Promise<void> {
    if (!db) {
        console.warn("Firestore not initialized, skipping history save")
        return
    }

    try {
        // Remove undefined fields to prevent Firestore errors
        const cleanData: any = {
            userId,
            cravingText: data.cravingText,
            location: data.location,
            batchId: data.batchId,
            createdAt: serverTimestamp(),
        }

        // Only include optional fields if they have values
        if (data.partySize !== undefined) cleanData.partySize = data.partySize
        if (data.date !== undefined) cleanData.date = data.date
        if (data.time !== undefined) cleanData.time = data.time

        await addDoc(collection(db, "searchHistory"), cleanData)
    } catch (error) {
        console.error("Failed to save search history:", error)
        // Don't throw - search history is non-critical
    }
}

/**
 * Get a user's search history (most recent first)
 */
export async function getSearchHistory(
    userId: string,
    maxItems = 20
): Promise<SearchHistoryItem[]> {
    if (!db) {
        console.warn("Firestore not initialized")
        return []
    }

    try {
        const q = query(
            collection(db, "searchHistory"),
            where("userId", "==", userId),
            orderBy("createdAt", "desc"),
            limit(maxItems)
        )

        const snapshot = await getDocs(q)
        return snapshot.docs.map((doc) => {
            const data = doc.data()
            return {
                id: doc.id,
                userId: data.userId,
                cravingText: data.cravingText,
                location: data.location,
                partySize: data.partySize,
                date: data.date,
                time: data.time,
                batchId: data.batchId,
                createdAt: data.createdAt instanceof Timestamp
                    ? data.createdAt.toDate()
                    : new Date(),
            }
        })
    } catch (error) {
        console.error("Failed to fetch search history:", error)
        return []
    }
}

/**
 * Clear all search history for a user
 */
export async function clearSearchHistory(userId: string): Promise<void> {
    if (!db) return

    try {
        const q = query(
            collection(db, "searchHistory"),
            where("userId", "==", userId)
        )

        const snapshot = await getDocs(q)
        const deletePromises = snapshot.docs.map((docSnap) =>
            deleteDoc(doc(db!, "searchHistory", docSnap.id))
        )

        await Promise.all(deletePromises)
    } catch (error) {
        console.error("Failed to clear search history:", error)
        throw error
    }
}
