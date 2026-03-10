import { collection, serverTimestamp, Firestore } from "firebase/firestore";
import { addDocumentNonBlocking } from "@/firebase/non-blocking-updates";

export type NotificationType = 'assignment' | 'status_change' | 'due_soon' | 'comment';

/**
 * Creates an in-app notification for a user.
 * Since we don't have Cloud Functions in this prototype environment,
 * we call this helper directly from client-side actions.
 */
export function createNotification(
  firestore: Firestore,
  recipientId: string,
  type: NotificationType,
  message: string,
  link?: string
) {
  if (!recipientId) return;

  const notificationsRef = collection(firestore, "users", recipientId, "notifications");
  addDocumentNonBlocking(notificationsRef, {
    recipientId,
    type,
    message,
    link: link || null,
    read: false,
    createdAt: serverTimestamp(),
  });
}
