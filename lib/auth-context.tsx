"use client"

import * as React from "react"
import {
    User,
    UserCredential,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut as firebaseSignOut,
    GoogleAuthProvider,
    signInWithPopup,
} from "firebase/auth"
import { auth } from "@/lib/firebase"

interface AuthContextType {
    user: User | null
    loading: boolean
    signIn: (email: string, password: string) => Promise<UserCredential>
    signUp: (email: string, password: string) => Promise<UserCredential>
    signInWithGoogle: () => Promise<UserCredential>
    signOut: () => Promise<void>
}

const AuthContext = React.createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = React.useState<User | null>(null)
    const [loading, setLoading] = React.useState(true)

    React.useEffect(() => {
        // Only run on client side when auth is available
        if (!auth) {
            setLoading(false)
            return
        }

        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUser(user)
            setLoading(false)
        })

        return () => unsubscribe()
    }, [])

    const signIn = async (email: string, password: string) => {
        if (!auth) throw new Error("Auth not initialized")
        return signInWithEmailAndPassword(auth, email, password)
    }

    const signUp = async (email: string, password: string) => {
        if (!auth) throw new Error("Auth not initialized")
        return createUserWithEmailAndPassword(auth, email, password)
    }

    const signInWithGoogle = async () => {
        if (!auth) throw new Error("Auth not initialized")
        const provider = new GoogleAuthProvider()
        return signInWithPopup(auth, provider)
    }

    const signOut = async () => {
        if (!auth) throw new Error("Auth not initialized")
        await firebaseSignOut(auth)
    }

    return (
        <AuthContext.Provider value={{ user, loading, signIn, signUp, signInWithGoogle, signOut }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = React.useContext(AuthContext)
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider")
    }
    return context
}
