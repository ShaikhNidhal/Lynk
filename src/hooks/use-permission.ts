"use client";

import { useFirebase } from "@/firebase";
import { PermissionKey } from "@/lib/permissions";
import { useMemo } from "react";

/**
 * Hook to check if the current user has a specific granular permission.
 * Super Admins (Admin/owner roles or '*' permission) bypass all checks.
 */
export function usePermission(permissionKey: PermissionKey): boolean {
  const { profile } = useFirebase();

  return useMemo(() => {
    if (!profile) return false;

    // Super Admin / Owner bypass (supports both lowercase/uppercase variants)
    if (
      profile.role === "Admin" ||
      profile.role === "admin" ||
      profile.role === "owner"
    ) {
      return true;
    }

    const permissions: string[] = profile.permissions || [];

    // Owner/Admin '*' permission bypass
    if (permissions.includes("*")) {
      return true;
    }

    // Fallback: If no custom claims are populated yet (e.g., initial load),
    // grant standard developer/team permissions.
    if (permissions.length === 0) {
      const defaultPermissions: PermissionKey[] = [
        "crm:read",
        "crm:create",
        "crm:update",
        "projects:read",
        "tasks:create",
        "tasks:update"
      ];
      return defaultPermissions.includes(permissionKey);
    }

    return permissions.includes(permissionKey);
  }, [profile, permissionKey]);
}
