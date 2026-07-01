"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { User } from "firebase/auth";

interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: string;
}

interface AuthContextType {
  user: User | null | undefined;
  profile: UserProfile | null;
  loading: boolean;
  error: Error | undefined;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  error: undefined,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, loading, error] = useAuthState(auth);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      if (user) {
        setProfileLoading(true);
        try {
          const docRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setProfile({
              uid: user.uid,
              email: data.email || user.email || "",
              name: data.name || user.displayName || "",
              role: data.role || "USER",
            });
          }
        } catch (e) {
          console.error("Error loading user profile", e);
        } finally {
          setProfileLoading(false);
        }
      } else {
        setProfile(null);
      }
    }
    loadProfile();
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading: loading || profileLoading,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
