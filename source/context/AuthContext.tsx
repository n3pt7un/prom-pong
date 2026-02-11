import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { onAuthStateChanged, signOut } from '../services/authService';
import { getMe, setupProfile, claimPlayer, updateMyProfile } from '../services/storageService';
import { AppUser } from '../types';

interface AuthContextType {
  authLoading: boolean;
  firebaseUser: any;
  currentUser: AppUser | null;
  isAdmin: boolean;
  unclaimedPlayers: any[];
  refreshMe: () => Promise<void>;
  handleSignOut: () => Promise<void>;
  handleProfileSetup: (name: string, avatar: string, bio: string) => Promise<void>;
  handleClaimPlayer: (playerId: string) => Promise<void>;
  handleUpdateProfile: (updates: { name?: string; avatar?: string; bio?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authLoading, setAuthLoading] = useState(true);
  const [firebaseUser, setFirebaseUser] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [unclaimedPlayers, setUnclaimedPlayers] = useState<any[]>([]);

  const refreshMe = async () => {
    if (!firebaseUser) return;
    try {
      const me = await getMe();
      setCurrentUser(me);
      if ((me as any).unclaimedPlayers) {
        setUnclaimedPlayers((me as any).unclaimedPlayers);
      }
    } catch (err) {
      console.error('Failed to fetch user profile:', err);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged((user) => {
      setFirebaseUser(user);
      setAuthLoading(false);
      if (!user) setCurrentUser(null);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!firebaseUser) return;
    refreshMe();
  }, [firebaseUser]);

  const handleSignOut = async () => {
    await signOut();
    setCurrentUser(null);
    setUnclaimedPlayers([]);
  };

  const handleProfileSetup = useCallback(async (name: string, avatar: string, bio: string) => {
    const updated = await setupProfile(name, avatar, bio);
    setCurrentUser(updated);
  }, []);

  const handleClaimPlayer = useCallback(async (playerId: string) => {
    const result = await claimPlayer(playerId);
    setCurrentUser(result);
  }, []);

  const handleUpdateProfile = useCallback(
    async (updates: { name?: string; avatar?: string; bio?: string }) => {
      const updatedPlayer = await updateMyProfile(updates);
      setCurrentUser((prev) => (prev ? { ...prev, player: updatedPlayer } : null));
    },
    []
  );

  const isAdmin = currentUser?.isAdmin || false;

  return (
    <AuthContext.Provider
      value={{
        authLoading,
        firebaseUser,
        currentUser,
        isAdmin,
        unclaimedPlayers,
        refreshMe,
        handleSignOut,
        handleProfileSetup,
        handleClaimPlayer,
        handleUpdateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
