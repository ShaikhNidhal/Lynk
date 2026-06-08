/**
 * Dictionary of system-wide granular permissions.
 */
export const PERMISSIONS = {
  // CRM Permissions
  "crm:read": "View CRM contacts, companies, pipelines, and deals",
  "crm:create": "Create new CRM records (contacts, companies, pipelines, deals)",
  "crm:update": "Modify existing CRM records",
  "crm:delete": "Delete CRM records (contacts, companies, pipelines, deals)",

  // Project Permissions
  "projects:read": "View projects and tasks",
  "projects:create": "Create new projects",
  "projects:update": "Edit project details and settings",
  "projects:delete": "Delete projects",

  // Task Permissions
  "tasks:create": "Create tasks inside projects",
  "tasks:update": "Edit tasks and progress details",
  "tasks:delete": "Delete tasks from projects",

  // General Settings
  "settings:read": "View workspace settings",
  "settings:write": "Edit workspace configurations and settings"
} as const;

export type PermissionKey = keyof typeof PERMISSIONS;
export type PermissionDescription = typeof PERMISSIONS[PermissionKey];

export const ALL_PERMISSIONS = Object.keys(PERMISSIONS) as PermissionKey[];
