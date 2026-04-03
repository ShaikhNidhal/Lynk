
"use client";

import { useEffect } from "react";
import { useUser, useFirebase } from "@/firebase";
import { doc, serverTimestamp } from "firebase/firestore";
import { updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";

/**
 * Handles the 'presence:update' logic by synchronizing the user's 
 * online status and activity timestamp with Firestore.
 */
export function PresenceTracker() {
  const { user } = useUser();
  const { firestore } = useFirebase();

  useEffect(() => {
    if (!user?.uid || !firestore) return;

    const userRef = doc(firestore, "users", user.uid);

    // Initial sign-in update
    updateDocumentNonBlocking(userRef, {
      presenceStatus: "online",
      lastActive: serverTimestamp(),
    });

    const updateActivity = () => {
      updateDocumentNonBlocking(userRef, {
        lastActive: serverTimestamp(),
        presenceStatus: "online",
      });
    };

    // Events that indicate activity
    window.addEventListener("mousemove", updateActivity);
    window.addEventListener("keydown", updateActivity);
    window.addEventListener("click", updateActivity);

    // Visibility change handling (mimics away/online)
    const handleVisibilityChange = () => {
      const status = document.visibilityState === "visible" ? "online" : "away";
      updateDocumentNonBlocking(userRef, {
        presenceStatus: status,
        lastActive: serverTimestamp(),
      });
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Clean up or set offline on unmount
    return () => {
      window.removeEventListener("mousemove", updateActivity);
      window.removeEventListener("keydown", updateActivity);
      window.removeEventListener("click", updateActivity);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      
      // Note: In a production environment, you'd use Firebase Realtime Database 
      // with onDisconnect() for reliable offline detection. For this prototype,
      // we mark as away.
      updateDocumentNonBlocking(userRef, {
        presenceStatus: "away",
        lastActive: serverTimestamp(),
      });
    };
  }, [user?.uid, firestore]);

  return null;
}
