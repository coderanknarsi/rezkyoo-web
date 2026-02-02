// lib/reservations.ts
// Helper functions for managing user reservations in Firestore

import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, orderBy, deleteDoc } from "firebase/firestore"
import { db } from "./firebase"

export interface Reservation {
  id: string
  batchId: string
  placeId: string
  restaurant: {
    name: string
    phone: string
    address?: string
    lat?: number
    lng?: number
  }
  customer: {
    name: string
    phone: string
  }
  reservation: {
    party_size: number
    date: string
    time: string
  }
  status: "confirmed" | "cancelled" | "completed"
  specialRequestStatus?: {
    honored: boolean
    note?: string
  }
  createdAt: string
  confirmedAt?: string
  cancelledAt?: string
}

/**
 * Save a confirmed reservation to user's profile
 */
export async function saveReservation(
  userId: string,
  bookingId: string,
  data: Omit<Reservation, "id">
): Promise<void> {
  try {
    if (!db) {
      console.warn("Firestore not initialized")
      return
    }
    const docRef = doc(db, "users", userId, "reservations", bookingId)
    await setDoc(docRef, {
      id: bookingId,
      ...data,
    })
  } catch (error) {
    console.error("Error saving reservation:", error)
    throw error
  }
}

/**
 * Get all reservations for a user
 */
export async function getUserReservations(userId: string): Promise<Reservation[]> {
  try {
    if (!db) {
      console.warn("Firestore not initialized")
      return []
    }
    const reservationsRef = collection(db, "users", userId, "reservations")
    const q = query(reservationsRef, orderBy("createdAt", "desc"))
    const snapshot = await getDocs(q)
    
    return snapshot.docs.map(doc => doc.data() as Reservation)
  } catch (error) {
    console.error("Error fetching reservations:", error)
    return []
  }
}

/**
 * Get a single reservation by ID
 */
export async function getReservation(userId: string, bookingId: string): Promise<Reservation | null> {
  try {
    if (!db) {
      console.warn("Firestore not initialized")
      return null
    }
    const docRef = doc(db, "users", userId, "reservations", bookingId)
    const docSnap = await getDoc(docRef)
    
    if (docSnap.exists()) {
      return docSnap.data() as Reservation
    }
    return null
  } catch (error) {
    console.error("Error fetching reservation:", error)
    return null
  }
}

/**
 * Update reservation status (e.g., mark as cancelled or completed)
 */
export async function updateReservationStatus(
  userId: string,
  bookingId: string,
  status: Reservation["status"],
  additionalData?: Partial<Reservation>
): Promise<void> {
  try {
    if (!db) {
      console.warn("Firestore not initialized")
      return
    }
    const docRef = doc(db, "users", userId, "reservations", bookingId)
    await updateDoc(docRef, {
      status,
      ...(status === "cancelled" ? { cancelledAt: new Date().toISOString() } : {}),
      ...additionalData,
    })
  } catch (error) {
    console.error("Error updating reservation:", error)
    throw error
  }
}

/**
 * Delete a reservation
 */
export async function deleteReservation(userId: string, bookingId: string): Promise<void> {
  try {
    if (!db) {
      console.warn("Firestore not initialized")
      return
    }
    const docRef = doc(db, "users", userId, "reservations", bookingId)
    await deleteDoc(docRef)
  } catch (error) {
    console.error("Error deleting reservation:", error)
    throw error
  }
}

/**
 * Get upcoming reservations (date >= today)
 */
export async function getUpcomingReservations(userId: string): Promise<Reservation[]> {
  const all = await getUserReservations(userId)
  const today = new Date().toISOString().split("T")[0]
  
  return all.filter(r => 
    r.status === "confirmed" && 
    r.reservation.date >= today
  ).sort((a, b) => {
    // Sort by date, then by time
    const dateCompare = a.reservation.date.localeCompare(b.reservation.date)
    if (dateCompare !== 0) return dateCompare
    return a.reservation.time.localeCompare(b.reservation.time)
  })
}

/**
 * Get past reservations (date < today or completed/cancelled)
 */
export async function getPastReservations(userId: string): Promise<Reservation[]> {
  const all = await getUserReservations(userId)
  const today = new Date().toISOString().split("T")[0]
  
  return all.filter(r => 
    r.status !== "confirmed" || 
    r.reservation.date < today
  ).sort((a, b) => {
    // Sort by date descending (most recent first)
    return b.reservation.date.localeCompare(a.reservation.date)
  })
}
