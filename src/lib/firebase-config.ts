
import { initializeFirebase } from "@/firebase";

/**
 * Legacy configuration bridge. 
 * Re-routes to the centralized initializeFirebase to prevent multiple SDK initializations.
 */
const sdks = initializeFirebase();

export const auth = sdks.auth;
export const db = sdks.firestore;
export const storage = sdks.storage;
