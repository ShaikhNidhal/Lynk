
'use client';

import React, { DependencyList, createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore, doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { Auth, User, onIdTokenChanged, getIdTokenResult, IdTokenResult } from 'firebase/auth';
import { FirebaseStorage } from 'firebase/storage';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener'

interface FirebaseProviderProps {
  children: ReactNode;
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
  storage: FirebaseStorage;
}

// Internal state for user authentication and profile
interface UserAuthState {
  user: User | null;
  profile: any | null;
  isUserLoading: boolean;
  userError: Error | null;
}

// Combined state for the Firebase context
export interface FirebaseContextState {
  areServicesAvailable: boolean;
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
  storage: FirebaseStorage | null;
  user: User | null;
  profile: any | null;
  isUserLoading: boolean;
  userError: Error | null;
}

export interface FirebaseServicesAndUser {
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
  storage: FirebaseStorage;
  user: User | null;
  profile: any | null;
  isUserLoading: boolean;
  userError: Error | null;
}

export interface UserHookResult {
  user: User | null;
  profile: any | null;
  isUserLoading: boolean;
  userError: Error | null;
}

export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({
  children,
  firebaseApp,
  firestore,
  auth,
  storage,
}) => {
  const [userAuthState, setUserAuthState] = useState<UserAuthState>({
    user: null,
    profile: null,
    isUserLoading: true,
    userError: null,
  });

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [idTokenResult, setIdTokenResultState] = useState<IdTokenResult | null>(null);

  // 1. Handle Auth State Changes using onIdTokenChanged (picks up token refreshes for claims)
  useEffect(() => {
    if (!auth) {
      setUserAuthState({ user: null, profile: null, isUserLoading: false, userError: new Error("Auth service not provided.") });
      return;
    }

    const unsubscribe = onIdTokenChanged(
      auth,
      async (user) => {
        setCurrentUser(user);
        if (user) {
          try {
            const tokenResult = await getIdTokenResult(user);
            setIdTokenResultState(tokenResult);
          } catch (err) {
            console.error("FirebaseProvider: Error fetching token result in onIdTokenChanged:", err);
          }
        } else {
          setIdTokenResultState(null);
          setUserAuthState({ user: null, profile: null, isUserLoading: false, userError: null });
        }
      },
      (error) => {
        console.error("FirebaseProvider: onIdTokenChanged error:", error);
        setUserAuthState(prev => ({ ...prev, isUserLoading: false, userError: error }));
      }
    );
    return () => unsubscribe();
  }, [auth]);

  // 2. Handle Profile Listener (Decoupled and synced with custom claims)
  useEffect(() => {
    if (!currentUser || !firestore || !idTokenResult) return;

    setUserAuthState(prev => ({ ...prev, isUserLoading: true }));

    let unsubscribeProfile: () => void = () => {};
    let isInitializing = false;

    const resolveProfile = async () => {
      try {
        const claimsRole = idTokenResult.claims.role;
        const workspaceId = idTokenResult.claims.workspaceId;
        const permissions = idTokenResult.claims.permissions;

        const userDocRef = doc(firestore, "users", currentUser.uid);
        
        // Return unsubscribe to effect cleanup
        unsubscribeProfile = onSnapshot(userDocRef, async (docSnap) => {
          if (!docSnap.exists()) {
            if (isInitializing) return;
            isInitializing = true;
            console.log(`User profile for ${currentUser.uid} does not exist. Initializing...`);
            try {
              // Initialize user profile
              const fallbackWorkspaceId = `ws-${currentUser.uid}`;
              const workspaceRef = doc(firestore, "workspaces", fallbackWorkspaceId);
              
              const email = currentUser.email || "";
              const emailPrefix = email.split('@')[0] || "User";
              const firstName = currentUser.displayName?.split(' ')[0] || emailPrefix;
              const lastName = currentUser.displayName?.split(' ').slice(1).join(' ') || "";
              
              // 1. Create Workspace
              await setDoc(workspaceRef, {
                id: fallbackWorkspaceId,
                name: `${firstName}'s Workspace`,
                slug: `${emailPrefix.toLowerCase().replace(/[^a-z0-9]/g, '-')}-workspace`,
                planType: "pro",
                ownerId: currentUser.uid,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
              });

              // Seed default roles out-of-the-box
              const adminRoleRef = doc(firestore, "workspaces", fallbackWorkspaceId, "roles", "role_workspace_administrator");
              await setDoc(adminRoleRef, {
                id: "role_workspace_administrator",
                name: "Workspace Administrator",
                permissions: [
                  "crm:read", "crm:create", "crm:update", "crm:delete",
                  "projects:read", "projects:create", "projects:update", "projects:delete",
                  "tasks:create", "tasks:update", "tasks:delete",
                  "settings:read", "settings:write"
                ],
                createdAt: serverTimestamp()
              });

              const salesManagerRoleRef = doc(firestore, "workspaces", fallbackWorkspaceId, "roles", "role_sales_manager");
              await setDoc(salesManagerRoleRef, {
                id: "role_sales_manager",
                name: "Sales Manager",
                permissions: [
                  "crm:read", "crm:create", "crm:update", "crm:delete",
                  "projects:read", "projects:create", "projects:update",
                  "tasks:create", "tasks:update"
                ],
                createdAt: serverTimestamp()
              });

              const standardRepRoleRef = doc(firestore, "workspaces", fallbackWorkspaceId, "roles", "role_standard_rep");
              await setDoc(standardRepRoleRef, {
                id: "role_standard_rep",
                name: "Standard Executive Account Representative",
                permissions: [
                  "crm:read", "crm:create", "crm:update",
                  "projects:read",
                  "tasks:create", "tasks:update"
                ],
                createdAt: serverTimestamp()
              });

              // 2. Create Workspace Membership
              const memberRef = doc(firestore, "workspaces", fallbackWorkspaceId, "members", currentUser.uid);
              const isAdminEmail = email === "nidhal.shaikh@gmail.com";
              await setDoc(memberRef, {
                id: currentUser.uid,
                workspaceId: fallbackWorkspaceId,
                userId: currentUser.uid,
                role: isAdminEmail ? "Admin" : "owner",
                roles: ["role_workspace_administrator"],
                email,
                firstName,
                lastName,
                joinedAt: serverTimestamp()
              });

              // 3. Create User Profile Document (triggers this listener again)
              await setDoc(userDocRef, {
                id: currentUser.uid,
                firstName,
                lastName,
                email,
                role: isAdminEmail ? "Admin" : "Team Member",
                currentWorkspaceId: fallbackWorkspaceId,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
              });

              console.log(`Successfully initialized user profile and workspace for UID: ${currentUser.uid}`);

              // 4. Register Session & Custom Claims on Server-side
              const idToken = await currentUser.getIdToken();
              const sessionResponse = await fetch('/api/auth/session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken })
              });

              if (sessionResponse.ok) {
                // Force token refresh to apply newly registered claims
                await currentUser.getIdToken(true);
              }
            } catch (err: any) {
              console.error("Failed to initialize user profile:", err);
              isInitializing = false;
              setUserAuthState({
                user: currentUser,
                profile: null,
                isUserLoading: false,
                userError: err,
              });
            }
          } else {
            const profileData = { ...docSnap.data(), id: docSnap.id } as any;
            
            setUserAuthState({
              user: currentUser,
              profile: { 
                ...profileData, 
                role: claimsRole || profileData.role,
                currentWorkspaceId: workspaceId || profileData.currentWorkspaceId,
                permissions: permissions || []
              },
              isUserLoading: false,
              userError: null,
            });
          }
        }, (err) => {
          console.error("Profile snapshot error:", err);
          setUserAuthState(prev => ({ ...prev, isUserLoading: false }));
        });
      } catch (err: any) {
        console.error("Auth Token Resolution error:", err);
        setUserAuthState(prev => ({ ...prev, isUserLoading: false, userError: err }));
      }
    };

    resolveProfile();

    return () => {
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, [currentUser, firestore, idTokenResult]);

  const contextValue = useMemo((): FirebaseContextState => {
    const servicesAvailable = !!(firebaseApp && firestore && auth && storage);
    return {
      areServicesAvailable: servicesAvailable,
      firebaseApp: servicesAvailable ? firebaseApp : null,
      firestore: servicesAvailable ? firestore : null,
      auth: servicesAvailable ? auth : null,
      storage: servicesAvailable ? storage : null,
      user: userAuthState.user,
      profile: userAuthState.profile,
      isUserLoading: userAuthState.isUserLoading,
      userError: userAuthState.userError,
    };
  }, [firebaseApp, firestore, auth, storage, userAuthState]);

  return (
    <FirebaseContext.Provider value={contextValue}>
      <FirebaseErrorListener />
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = (): FirebaseServicesAndUser => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider.');
  }
  if (!context.areServicesAvailable || !context.firebaseApp || !context.firestore || !context.auth || !context.storage) {
    throw new Error('Firebase core services not available. Check FirebaseProvider props.');
  }
  return {
    firebaseApp: context.firebaseApp,
    firestore: context.firestore,
    auth: context.auth,
    storage: context.storage,
    user: context.user,
    profile: context.profile,
    isUserLoading: context.isUserLoading,
    userError: context.userError,
  };
};

export const useAuth = (): Auth => useFirebase().auth;
export const useFirestore = (): Firestore => useFirebase().firestore;
export const useFirebaseApp = (): FirebaseApp => useFirebase().firebaseApp;
export const useStorage = (): FirebaseStorage => useFirebase().storage;

type MemoFirebase <T> = T & {__memo?: boolean};

export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T | (MemoFirebase<T>) {
  const memoized = useMemo(factory, deps);
  if(typeof memoized !== 'object' || memoized === null) return memoized;
  (memoized as MemoFirebase<T>).__memo = true;
  return memoized;
}

export const useUser = (): UserHookResult => {
  const { user, profile, isUserLoading, userError } = useFirebase();
  return { user, profile, isUserLoading, userError };
};
