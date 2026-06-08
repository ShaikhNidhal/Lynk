"use client";

import { AppShell } from "@/components/layout/shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc, 
  serverTimestamp, 
  limit 
} from "firebase/firestore";
import { 
  Shield, 
  Users, 
  FolderKanban, 
  Building2, 
  LineChart, 
  Loader2, 
  Database, 
  Trash2, 
  Play, 
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Key,
  Plus,
  Lock
} from "lucide-react";
import { useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PERMISSIONS, ALL_PERMISSIONS, PermissionKey } from "@/lib/permissions";

export default function AdminPage() {
  const { firestore, profile, user } = useFirebase();
  const { toast } = useToast();
  const [seeding, setSeeding] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);

  // 1. RBAC Guard - Verify Admin status
  const isAdmin = profile?.role === "Admin";

  // Global SaaS States
  const [activeTab, setActiveTab] = useState("users");
  const [workspaceSearch, setWorkspaceSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [switchingWorkspaceId, setSwitchingWorkspaceId] = useState<string | null>(null);
  const [updatingGlobalRole, setUpdatingGlobalRole] = useState<string | null>(null);

  // Global SaaS Queries
  const workspacesQuery = useMemoFirebase(() => {
    if (!firestore || !isAdmin) return null;
    return query(collection(firestore, "workspaces"), limit(100));
  }, [firestore, isAdmin]);
  const { data: globalWorkspaces, isLoading: isWorkspacesLoading } = useCollection(workspacesQuery);

  const globalUsersQuery = useMemoFirebase(() => {
    if (!firestore || !isAdmin) return null;
    return query(collection(firestore, "users"), limit(100));
  }, [firestore, isAdmin]);
  const { data: globalUsers, isLoading: isGlobalUsersLoading } = useCollection(globalUsersQuery);

  // Filtered SaaS Lists
  const filteredWorkspaces = useMemo(() => {
    if (!globalWorkspaces) return [];
    return globalWorkspaces.filter(ws => 
      ws.name?.toLowerCase().includes(workspaceSearch.toLowerCase()) ||
      ws.id?.toLowerCase().includes(workspaceSearch.toLowerCase()) ||
      ws.slug?.toLowerCase().includes(workspaceSearch.toLowerCase())
    );
  }, [globalWorkspaces, workspaceSearch]);

  const filteredUsers = useMemo(() => {
    if (!globalUsers) return [];
    return globalUsers.filter(u => 
      `${u.firstName || ""} ${u.lastName || ""}`.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.id?.toLowerCase().includes(userSearch.toLowerCase())
    );
  }, [globalUsers, userSearch]);

  // Context-switching & Global Role Handlers
  const handleSwitchWorkspace = async (targetWorkspaceId: string) => {
    if (!firestore || !user?.uid) return;
    setSwitchingWorkspaceId(targetWorkspaceId);
    try {
      // 1. Update currentWorkspaceId in users/{uid}
      const userRef = doc(firestore, "users", user.uid);
      await setDoc(userRef, { currentWorkspaceId: targetWorkspaceId }, { merge: true });

      // 2. Recalculate server session claims
      const idToken = await user.getIdToken();
      const response = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken })
      });

      if (!response.ok) {
        throw new Error("Failed to recalculate session context.");
      }

      // 3. Force-refresh token on client-side
      await user.getIdToken(true);

      toast({
        title: "Workspace Context Switched",
        description: `Successfully switched workspace to ${targetWorkspaceId}. Reloading page...`,
      });

      // 4. Reload page
      window.location.reload();
    } catch (e: any) {
      toast({
        title: "Failed to Switch Workspace",
        description: e.message,
        variant: "destructive"
      });
    } finally {
      setSwitchingWorkspaceId(null);
    }
  };

  const handleGlobalRoleChange = async (userId: string, newRole: string) => {
    if (!firestore) return;
    setUpdatingGlobalRole(userId);
    try {
      const userRef = doc(firestore, "users", userId);
      await setDoc(userRef, { role: newRole }, { merge: true });
      toast({
        title: "Global Role Updated",
        description: `User global role has been updated to ${newRole}.`,
      });
    } catch (e: any) {
      toast({
        title: "Failed to Update Global Role",
        description: e.message,
        variant: "destructive"
      });
    } finally {
      setUpdatingGlobalRole(null);
    }
  };

  // Lifecycle Management States
  const [isAddWorkspaceOpen, setIsAddWorkspaceOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [newWorkspaceOwner, setNewWorkspaceOwner] = useState("");

  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUserFirstName, setNewUserFirstName] = useState("");
  const [newUserLastName, setNewUserLastName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserGlobalRole, setNewUserGlobalRole] = useState("Team Member");
  const [newUserWorkspaceId, setNewUserWorkspaceId] = useState("");

  const [isEditPermissionsOpen, setIsEditPermissionsOpen] = useState(false);
  const [selectedUserPerms, setSelectedUserPerms] = useState<any>(null);
  const [userPermsGlobalRole, setUserPermsGlobalRole] = useState("");
  const [userPermsWorkspaceId, setUserPermsWorkspaceId] = useState("");
  const [userPermsWorkspaceRole, setUserPermsWorkspaceRole] = useState("");
  const [userPermsCustomRoles, setUserPermsCustomRoles] = useState<string[]>([]);
  const [userPermsCustomRolesList, setUserPermsCustomRolesList] = useState<any[]>([]);
  const [loadingWorkspaceRoles, setLoadingWorkspaceRoles] = useState(false);

  // Lifecycle & Permission Handlers
  const fetchWorkspaceRoles = async (workspaceId: string) => {
    if (!firestore || !workspaceId) {
      setUserPermsCustomRolesList([]);
      return;
    }
    setLoadingWorkspaceRoles(true);
    try {
      const snap = await getDocs(collection(firestore, "workspaces", workspaceId, "roles"));
      const roles = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUserPermsCustomRolesList(roles);
    } catch (e) {
      console.error("Failed to load workspace roles:", e);
      setUserPermsCustomRolesList([]);
    } finally {
      setLoadingWorkspaceRoles(false);
    }
  };

  const handleOpenEditPermissions = async (u: any) => {
    setSelectedUserPerms(u);
    setUserPermsGlobalRole(u.role || "Team Member");
    setUserPermsWorkspaceId(u.currentWorkspaceId || "");
    
    if (u.currentWorkspaceId && firestore) {
      try {
        const memberSnap = await getDocs(query(
          collection(firestore, "workspaces", u.currentWorkspaceId, "members"),
          where("id", "==", u.id)
        ));
        const memberData = memberSnap.docs[0]?.data();
        setUserPermsWorkspaceRole(memberData?.role || "Team Member");
        setUserPermsCustomRoles(memberData?.roles || []);
      } catch (e) {
        setUserPermsWorkspaceRole("Team Member");
        setUserPermsCustomRoles([]);
      }
      await fetchWorkspaceRoles(u.currentWorkspaceId);
    } else {
      setUserPermsWorkspaceRole("Team Member");
      setUserPermsCustomRoles([]);
      setUserPermsCustomRolesList([]);
    }
    setIsEditPermissionsOpen(true);
  };

  const handleCreateWorkspace = async () => {
    if (!firestore || !newWorkspaceName) return;
    const wsId = `ws-${Math.random().toString(36).substring(2, 11)}`;
    const slug = newWorkspaceName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const wsRef = doc(firestore, "workspaces", wsId);
    try {
      await setDoc(wsRef, {
        id: wsId,
        name: newWorkspaceName,
        slug,
        planType: "pro",
        ownerId: newWorkspaceOwner || "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      const defaultRoles = [
        {
          id: 'role_workspace_administrator',
          name: 'Workspace Administrator',
          permissions: [
            'crm:read', 'crm:create', 'crm:update', 'crm:delete',
            'projects:read', 'projects:create', 'projects:update', 'projects:delete',
            'tasks:create', 'tasks:update', 'tasks:delete',
            'settings:read', 'settings:write'
          ]
        },
        {
          id: 'role_sales_manager',
          name: 'Sales Manager',
          permissions: [
            'crm:read', 'crm:create', 'crm:update', 'crm:delete',
            'projects:read', 'projects:create', 'projects:update',
            'tasks:create', 'tasks:update'
          ]
        },
        {
          id: 'role_standard_rep',
          name: 'Standard Executive Account Representative',
          permissions: [
            'crm:read', 'crm:create', 'crm:update',
            'projects:read',
            'tasks:create', 'tasks:update'
          ]
        }
      ];

      for (const role of defaultRoles) {
        const roleRef = doc(firestore, "workspaces", wsId, "roles", role.id);
        await setDoc(roleRef, {
          id: role.id,
          name: role.name,
          permissions: role.permissions,
          createdAt: serverTimestamp()
        });
      }

      if (newWorkspaceOwner) {
        const ownerUserRef = doc(firestore, "users", newWorkspaceOwner);
        const memberRef = doc(firestore, "workspaces", wsId, "members", newWorkspaceOwner);
        const ownerSnap = await getDocs(query(collection(firestore, "users"), where("id", "==", newWorkspaceOwner)));
        const ownerData = ownerSnap.docs[0]?.data();
        
        await setDoc(memberRef, {
          id: newWorkspaceOwner,
          workspaceId: wsId,
          userId: newWorkspaceOwner,
          role: "Admin",
          roles: ["role_workspace_administrator"],
          email: ownerData?.email || "",
          firstName: ownerData?.firstName || "Owner",
          lastName: ownerData?.lastName || "",
          joinedAt: serverTimestamp()
        });

        await setDoc(ownerUserRef, { currentWorkspaceId: wsId }, { merge: true });
      }

      toast({
        title: "Workspace Created",
        description: `Successfully created workspace "${newWorkspaceName}".`,
      });
      setNewWorkspaceName("");
      setNewWorkspaceOwner("");
      setIsAddWorkspaceOpen(false);
    } catch (e: any) {
      toast({
        title: "Failed to create workspace",
        description: e.message,
        variant: "destructive"
      });
    }
  };

  const handleDeleteWorkspace = async (workspaceId: string) => {
    if (!firestore || !workspaceId) return;
    if (!confirm(`WARNING: Are you sure you want to permanently delete workspace ${workspaceId}? This will delete the workspace and all its subcollections.`)) {
      return;
    }
    try {
      const subs = await getDocs(collection(firestore, "workspaces", workspaceId, "subsidiaries"));
      for (const d of subs.docs) await deleteDoc(d.ref);

      const depts = await getDocs(collection(firestore, "workspaces", workspaceId, "departments"));
      for (const d of depts.docs) await deleteDoc(d.ref);

      const tms = await getDocs(collection(firestore, "workspaces", workspaceId, "teams"));
      for (const d of tms.docs) await deleteDoc(d.ref);

      const mems = await getDocs(collection(firestore, "workspaces", workspaceId, "members"));
      for (const d of mems.docs) await deleteDoc(d.ref);

      const rls = await getDocs(collection(firestore, "workspaces", workspaceId, "roles"));
      for (const d of rls.docs) await deleteDoc(d.ref);

      await deleteDoc(doc(firestore, "workspaces", workspaceId));

      toast({
        title: "Workspace Purged",
        description: `Successfully deleted workspace ${workspaceId}.`,
      });
    } catch (e: any) {
      toast({
        title: "Failed to delete workspace",
        description: e.message,
        variant: "destructive"
      });
    }
  };

  const handleCreateUserProfile = async () => {
    if (!firestore || !newUserEmail || !newUserFirstName) return;
    const uid = `user_${Math.random().toString(36).substring(2, 11)}`;
    const userRef = doc(firestore, "users", uid);
    try {
      await setDoc(userRef, {
        id: uid,
        firstName: newUserFirstName,
        lastName: newUserLastName || "",
        email: newUserEmail,
        role: newUserGlobalRole || "Team Member",
        currentWorkspaceId: newUserWorkspaceId || "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      if (newUserWorkspaceId) {
        const memberRef = doc(firestore, "workspaces", newUserWorkspaceId, "members", uid);
        await setDoc(memberRef, {
          id: uid,
          workspaceId: newUserWorkspaceId,
          userId: uid,
          role: newUserGlobalRole === "Admin" ? "Admin" : "Team Member",
          roles: ["role_standard_rep"],
          email: newUserEmail,
          firstName: newUserFirstName,
          lastName: newUserLastName || "",
          joinedAt: serverTimestamp()
        });
      }

      toast({
        title: "User Created",
        description: `Successfully created user profile for ${newUserFirstName}.`,
      });
      setNewUserFirstName("");
      setNewUserLastName("");
      setNewUserEmail("");
      setNewUserWorkspaceId("");
      setIsAddUserOpen(false);
    } catch (e: any) {
      toast({
        title: "Failed to create user",
        description: e.message,
        variant: "destructive"
      });
    }
  };

  const handleDeleteUserProfile = async (userId: string, workspaceId: string) => {
    if (!firestore || !userId) return;
    if (userId === user?.uid) {
      toast({
        title: "Action Denied",
        description: "You cannot delete your own account.",
        variant: "destructive"
      });
      return;
    }
    if (!confirm(`Are you sure you want to permanently delete user ${userId}? This will remove their user profile.`)) {
      return;
    }
    try {
      await deleteDoc(doc(firestore, "users", userId));

      if (workspaceId) {
        await deleteDoc(doc(firestore, "workspaces", workspaceId, "members", userId));
      } else {
        const workspacesSnap = await getDocs(collection(firestore, "workspaces"));
        for (const wsDoc of workspacesSnap.docs) {
          const memberRef = doc(firestore, "workspaces", wsDoc.id, "members", userId);
          await deleteDoc(memberRef).catch(() => {});
        }
      }

      toast({
        title: "User Deleted",
        description: "Successfully deleted user profile.",
      });
    } catch (e: any) {
      toast({
        title: "Failed to delete user",
        description: e.message,
        variant: "destructive"
      });
    }
  };

  const handleUpdateUserPermissions = async () => {
    if (!firestore || !selectedUserPerms) return;
    try {
      const userRef = doc(firestore, "users", selectedUserPerms.id);
      await setDoc(userRef, { 
        role: userPermsGlobalRole,
        currentWorkspaceId: userPermsWorkspaceId
      }, { merge: true });

      if (userPermsWorkspaceId) {
        const memberRef = doc(firestore, "workspaces", userPermsWorkspaceId, "members", selectedUserPerms.id);
        await setDoc(memberRef, { 
          role: userPermsWorkspaceRole, 
          roles: userPermsCustomRoles 
        }, { merge: true });
      }

      toast({
        title: "Permissions Saved",
        description: "Successfully updated system and workspace-level roles.",
      });
      setIsEditPermissionsOpen(false);
      setSelectedUserPerms(null);
    } catch (e: any) {
      toast({
        title: "Failed to save permissions",
        description: e.message,
        variant: "destructive"
      });
    }
  };

  // Corporate Hierarchy States
  const [newSubsidiaryName, setNewSubsidiaryName] = useState("");
  const [editingSubsidiary, setEditingSubsidiary] = useState<any>(null);
  const [editSubsidiaryName, setEditSubsidiaryName] = useState("");
  const [isCreateSubsidiaryOpen, setIsCreateSubsidiaryOpen] = useState(false);
  const [isEditSubsidiaryOpen, setIsEditSubsidiaryOpen] = useState(false);

  const [newDepartmentName, setNewDepartmentName] = useState("");
  const [newDepartmentSubId, setNewDepartmentSubId] = useState("");
  const [editingDepartment, setEditingDepartment] = useState<any>(null);
  const [editDepartmentName, setEditDepartmentName] = useState("");
  const [editDepartmentSubId, setEditDepartmentSubId] = useState("");
  const [isCreateDepartmentOpen, setIsCreateDepartmentOpen] = useState(false);
  const [isEditDepartmentOpen, setIsEditDepartmentOpen] = useState(false);

  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamSubId, setNewTeamSubId] = useState("");
  const [newTeamDeptId, setNewTeamDeptId] = useState("");
  const [editingTeam, setEditingTeam] = useState<any>(null);
  const [editTeamName, setEditTeamName] = useState("");
  const [editTeamSubId, setEditTeamSubId] = useState("");
  const [editTeamDeptId, setEditTeamDeptId] = useState("");
  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false);
  const [isEditTeamOpen, setIsEditTeamOpen] = useState(false);

  const [assigningMember, setAssigningMember] = useState<any>(null);
  const [isAssignMemberOpen, setIsAssignMemberOpen] = useState(false);
  const [memberAssignedSubId, setMemberAssignedSubId] = useState("");
  const [memberAssignedDeptId, setMemberAssignedDeptId] = useState("");
  const [memberAssignedTeamId, setMemberAssignedTeamId] = useState("");

  // Corporate Hierarchy Queries
  const subsidiariesQuery = useMemoFirebase(() => {
    if (!firestore || !profile?.currentWorkspaceId) return null;
    return query(collection(firestore, "workspaces", profile.currentWorkspaceId, "subsidiaries"), limit(100));
  }, [firestore, profile?.currentWorkspaceId]);
  const { data: subsidiaries, isLoading: isSubsidiariesLoading } = useCollection(subsidiariesQuery);

  const departmentsQuery = useMemoFirebase(() => {
    if (!firestore || !profile?.currentWorkspaceId) return null;
    return query(collection(firestore, "workspaces", profile.currentWorkspaceId, "departments"), limit(100));
  }, [firestore, profile?.currentWorkspaceId]);
  const { data: departments, isLoading: isDepartmentsLoading } = useCollection(departmentsQuery);

  const teamsQuery = useMemoFirebase(() => {
    if (!firestore || !profile?.currentWorkspaceId) return null;
    return query(collection(firestore, "workspaces", profile.currentWorkspaceId, "teams"), limit(100));
  }, [firestore, profile?.currentWorkspaceId]);
  const { data: teams, isLoading: isTeamsLoading } = useCollection(teamsQuery);

  // Corporate Hierarchy Handlers
  const handleAddSubsidiary = async () => {
    if (!firestore || !profile?.currentWorkspaceId || !newSubsidiaryName) return;
    const subId = `sub_${Math.random().toString(36).substring(2, 11)}`;
    const subRef = doc(firestore, "workspaces", profile.currentWorkspaceId, "subsidiaries", subId);
    try {
      await setDoc(subRef, {
        id: subId,
        name: newSubsidiaryName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      toast({
        title: "Subsidiary Created",
        description: `Successfully created company subsidiary "${newSubsidiaryName}".`,
      });
      setNewSubsidiaryName("");
      setIsCreateSubsidiaryOpen(false);
    } catch (e: any) {
      toast({
        title: "Failed to create subsidiary",
        description: e.message,
        variant: "destructive"
      });
    }
  };

  const handleEditSubsidiary = async () => {
    if (!firestore || !profile?.currentWorkspaceId || !editingSubsidiary || !editSubsidiaryName) return;
    const subRef = doc(firestore, "workspaces", profile.currentWorkspaceId, "subsidiaries", editingSubsidiary.id);
    try {
      await setDoc(subRef, { name: editSubsidiaryName, updatedAt: serverTimestamp() }, { merge: true });
      toast({
        title: "Subsidiary Updated",
        description: `Successfully renamed subsidiary.`,
      });
      setEditingSubsidiary(null);
      setEditSubsidiaryName("");
      setIsEditSubsidiaryOpen(false);
    } catch (e: any) {
      toast({
        title: "Failed to update subsidiary",
        description: e.message,
        variant: "destructive"
      });
    }
  };

  const handleDeleteSubsidiary = async (id: string) => {
    if (!firestore || !profile?.currentWorkspaceId) return;
    if (!confirm("Are you sure you want to delete this subsidiary? Departments and teams under this subsidiary will be affected.")) return;
    const subRef = doc(firestore, "workspaces", profile.currentWorkspaceId, "subsidiaries", id);
    try {
      await deleteDoc(subRef);
      toast({
        title: "Subsidiary Deleted",
        description: "Successfully deleted subsidiary.",
      });
    } catch (e: any) {
      toast({
        title: "Failed to delete subsidiary",
        description: e.message,
        variant: "destructive"
      });
    }
  };

  const handleAddDepartment = async () => {
    if (!firestore || !profile?.currentWorkspaceId || !newDepartmentName || !newDepartmentSubId) return;
    const deptId = `dept_${Math.random().toString(36).substring(2, 11)}`;
    const deptRef = doc(firestore, "workspaces", profile.currentWorkspaceId, "departments", deptId);
    try {
      await setDoc(deptRef, {
        id: deptId,
        name: newDepartmentName,
        subsidiaryId: newDepartmentSubId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      toast({
        title: "Department Created",
        description: `Successfully created department "${newDepartmentName}".`,
      });
      setNewDepartmentName("");
      setNewDepartmentSubId("");
      setIsCreateDepartmentOpen(false);
    } catch (e: any) {
      toast({
        title: "Failed to create department",
        description: e.message,
        variant: "destructive"
      });
    }
  };

  const handleEditDepartment = async () => {
    if (!firestore || !profile?.currentWorkspaceId || !editingDepartment || !editDepartmentName || !editDepartmentSubId) return;
    const deptRef = doc(firestore, "workspaces", profile.currentWorkspaceId, "departments", editingDepartment.id);
    try {
      await setDoc(deptRef, { name: editDepartmentName, subsidiaryId: editDepartmentSubId, updatedAt: serverTimestamp() }, { merge: true });
      toast({
        title: "Department Updated",
        description: `Successfully updated department details.`,
      });
      setEditingDepartment(null);
      setEditDepartmentName("");
      setEditDepartmentSubId("");
      setIsEditDepartmentOpen(false);
    } catch (e: any) {
      toast({
        title: "Failed to update department",
        description: e.message,
        variant: "destructive"
      });
    }
  };

  const handleDeleteDepartment = async (id: string) => {
    if (!firestore || !profile?.currentWorkspaceId) return;
    if (!confirm("Are you sure you want to delete this department? Teams under this department will be affected.")) return;
    const deptRef = doc(firestore, "workspaces", profile.currentWorkspaceId, "departments", id);
    try {
      await deleteDoc(deptRef);
      toast({
        title: "Department Deleted",
        description: "Successfully deleted department.",
      });
    } catch (e: any) {
      toast({
        title: "Failed to delete department",
        description: e.message,
        variant: "destructive"
      });
    }
  };

  const handleAddTeam = async () => {
    if (!firestore || !profile?.currentWorkspaceId || !newTeamName || !newTeamSubId || !newTeamDeptId) return;
    const teamId = `team_${Math.random().toString(36).substring(2, 11)}`;
    const teamRef = doc(firestore, "workspaces", profile.currentWorkspaceId, "teams", teamId);
    try {
      await setDoc(teamRef, {
        id: teamId,
        name: newTeamName,
        subsidiaryId: newTeamSubId,
        departmentId: newTeamDeptId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      toast({
        title: "Team Created",
        description: `Successfully created team "${newTeamName}".`,
      });
      setNewTeamName("");
      setNewTeamSubId("");
      setNewTeamDeptId("");
      setIsCreateTeamOpen(false);
    } catch (e: any) {
      toast({
        title: "Failed to create team",
        description: e.message,
        variant: "destructive"
      });
    }
  };

  const handleEditTeam = async () => {
    if (!firestore || !profile?.currentWorkspaceId || !editingTeam || !editTeamName || !editTeamSubId || !editTeamDeptId) return;
    const teamRef = doc(firestore, "workspaces", profile.currentWorkspaceId, "teams", editingTeam.id);
    try {
      await setDoc(teamRef, { name: editTeamName, subsidiaryId: editTeamSubId, departmentId: editTeamDeptId, updatedAt: serverTimestamp() }, { merge: true });
      toast({
        title: "Team Updated",
        description: `Successfully updated team details.`,
      });
      setEditingTeam(null);
      setEditTeamName("");
      setEditTeamSubId("");
      setEditTeamDeptId("");
      setIsEditTeamOpen(false);
    } catch (e: any) {
      toast({
        title: "Failed to update team",
        description: e.message,
        variant: "destructive"
      });
    }
  };

  const handleDeleteTeam = async (id: string) => {
    if (!firestore || !profile?.currentWorkspaceId) return;
    if (!confirm("Are you sure you want to delete this team?")) return;
    const teamRef = doc(firestore, "workspaces", profile.currentWorkspaceId, "teams", id);
    try {
      await deleteDoc(teamRef);
      toast({
        title: "Team Deleted",
        description: "Successfully deleted team.",
      });
    } catch (e: any) {
      toast({
        title: "Failed to delete team",
        description: e.message,
        variant: "destructive"
      });
    }
  };

  const handleSaveMemberAssignments = async () => {
    if (!firestore || !profile?.currentWorkspaceId || !assigningMember) return;
    const memberRef = doc(firestore, "workspaces", profile.currentWorkspaceId, "members", assigningMember.id);
    try {
      await setDoc(memberRef, {
        subsidiaryId: memberAssignedSubId || "",
        departmentId: memberAssignedDeptId || "",
        teamId: memberAssignedTeamId || ""
      }, { merge: true });
      
      toast({
        title: "Assignments Saved",
        description: `Updated corporate alignment for ${assigningMember.firstName}.`,
      });
      setIsAssignMemberOpen(false);
      setAssigningMember(null);
      setMemberAssignedSubId("");
      setMemberAssignedDeptId("");
      setMemberAssignedTeamId("");
    } catch (e: any) {
      toast({
        title: "Failed to save assignments",
        description: e.message,
        variant: "destructive"
      });
    }
  };


  // 2. Fetch all members in the current workspace
  const membersQuery = useMemoFirebase(() => {
    if (!firestore || !profile?.currentWorkspaceId) return null;
    return query(collection(firestore, "workspaces", profile.currentWorkspaceId, "members"), limit(100));
  }, [firestore, profile?.currentWorkspaceId]);
  const { data: members, isLoading: isMembersLoading } = useCollection(membersQuery);

  // 3. Fetch counts for stats
  const projectsQuery = useMemoFirebase(() => {
    if (!firestore || !profile?.currentWorkspaceId) return null;
    return query(collection(firestore, "projects"), where("workspaceId", "==", profile.currentWorkspaceId));
  }, [firestore, profile?.currentWorkspaceId]);
  const { data: projects } = useCollection(projectsQuery);

  const dealsQuery = useMemoFirebase(() => {
    if (!firestore || !profile?.currentWorkspaceId) return null;
    return query(collection(firestore, "deals"), where("workspaceId", "==", profile.currentWorkspaceId));
  }, [firestore, profile?.currentWorkspaceId]);
  const { data: deals } = useCollection(dealsQuery);

  const companiesQuery = useMemoFirebase(() => {
    if (!firestore || !profile?.currentWorkspaceId) return null;
    return query(collection(firestore, "companies"), where("workspaceId", "==", profile.currentWorkspaceId));
  }, [firestore, profile?.currentWorkspaceId]);
  const { data: companies } = useCollection(companiesQuery);
 
  // 4. Fetch Custom Roles
  const rolesQuery = useMemoFirebase(() => {
    if (!firestore || !profile?.currentWorkspaceId) return null;
    return query(collection(firestore, "workspaces", profile.currentWorkspaceId, "roles"), limit(100));
  }, [firestore, profile?.currentWorkspaceId]);
  const { data: workspaceRoles, isLoading: isRolesLoading } = useCollection(rolesQuery);

  // States for Custom Roles assignment
  const [selectedMember, setSelectedMember] = useState<any | null>(null);
  const [isManageRolesOpen, setIsManageRolesOpen] = useState(false);
  const [updatingMemberRoles, setUpdatingMemberRoles] = useState(false);

  // States for creating custom roles
  const [newRoleName, setNewRoleName] = useState("");
  const [newRolePermissions, setNewRolePermissions] = useState<string[]>([]);
  const [isCreateRoleOpen, setIsCreateRoleOpen] = useState(false);

  // States for editing custom roles
  const [editingRole, setEditingRole] = useState<any | null>(null);
  const [editRoleName, setEditRoleName] = useState("");
  const [editRolePermissions, setEditRolePermissions] = useState<string[]>([]);
  const [isEditRoleOpen, setIsEditRoleOpen] = useState(false);

  const handleSaveMemberRoles = async (memberId: string, roleIds: string[]) => {
    if (!firestore || !profile?.currentWorkspaceId) return;
    setUpdatingMemberRoles(true);
    try {
      const memberRef = doc(firestore, "workspaces", profile.currentWorkspaceId, "members", memberId);
      updateDocumentNonBlocking(memberRef, { roles: roleIds });
      toast({
        title: "Roles Updated",
        description: "Assigned custom roles saved successfully.",
      });
      setIsManageRolesOpen(false);
    } catch (e: any) {
      toast({
        title: "Failed to update roles",
        description: e.message,
        variant: "destructive"
      });
    } finally {
      setUpdatingMemberRoles(false);
    }
  };

  const handleCreateRole = async () => {
    if (!firestore || !profile?.currentWorkspaceId || !newRoleName) return;
    const roleId = `role_${Math.random().toString(36).substring(2, 11)}`;
    const roleRef = doc(firestore, "workspaces", profile.currentWorkspaceId, "roles", roleId);
    try {
      await setDoc(roleRef, {
        id: roleId,
        name: newRoleName,
        permissions: newRolePermissions,
        createdAt: serverTimestamp()
      });
      toast({
        title: "Role Created",
        description: `Successfully created custom role "${newRoleName}".`,
      });
      setIsCreateRoleOpen(false);
      setNewRoleName("");
      setNewRolePermissions([]);
    } catch (e: any) {
      toast({
        title: "Failed to create role",
        description: e.message,
        variant: "destructive"
      });
    }
  };

  const handleEditRole = async () => {
    if (!firestore || !profile?.currentWorkspaceId || !editingRole) return;
    const roleRef = doc(firestore, "workspaces", profile.currentWorkspaceId, "roles", editingRole.id);
    try {
      await setDoc(roleRef, {
        name: editRoleName,
        permissions: editRolePermissions,
      }, { merge: true });
      toast({
        title: "Role Updated",
        description: `Successfully updated role details.`,
      });
      setIsEditRoleOpen(false);
      setEditingRole(null);
    } catch (e: any) {
      toast({
        title: "Failed to update role",
        description: e.message,
        variant: "destructive"
      });
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    if (!firestore || !profile?.currentWorkspaceId) return;
    if (["role_workspace_administrator", "role_sales_manager", "role_standard_rep"].includes(roleId)) {
      toast({
        title: "Cannot Delete",
        description: "Default standard roles cannot be deleted for system stability.",
        variant: "destructive"
      });
      return;
    }
    if (!confirm("Are you sure you want to delete this custom role? Users assigned to this role will lose its permissions.")) {
      return;
    }
    const roleRef = doc(firestore, "workspaces", profile.currentWorkspaceId, "roles", roleId);
    try {
      await deleteDoc(roleRef);
      toast({
        title: "Role Deleted",
        description: "Successfully deleted the custom role.",
      });
    } catch (e: any) {
      toast({
        title: "Failed to delete role",
        description: e.message,
        variant: "destructive"
      });
    }
  };

  const handleRoleChange = async (memberId: string, newRole: string) => {
    if (!firestore || !profile?.currentWorkspaceId) return;
    setUpdatingRole(memberId);
    try {
      // Update in workspace member subcollection
      const memberRef = doc(firestore, "workspaces", profile.currentWorkspaceId, "members", memberId);
      updateDocumentNonBlocking(memberRef, { role: newRole });

      // Update in global users collection
      const userRef = doc(firestore, "users", memberId);
      updateDocumentNonBlocking(userRef, { role: newRole });

      toast({
        title: "Role Updated",
        description: `Successfully updated user role to ${newRole}.`,
      });
    } catch (e: any) {
      toast({
        title: "Error updating role",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setUpdatingRole(null);
    }
  };

  const handleSeedData = async () => {
    if (!firestore || !profile?.currentWorkspaceId || !user?.uid) return;
    setSeeding(true);
    const workspaceId = profile.currentWorkspaceId;
    const currentUserId = user.uid;

    try {
      // 1. Create a pipeline
      const pipelineRef = doc(firestore, "pipelines", "pipeline-demo");
      await setDoc(pipelineRef, {
        id: "pipeline-demo",
        workspaceId,
        name: "Enterprise Sales Pipeline",
        stages: [
          { id: "lead", name: "Lead Discovery", color: "bg-blue-500", probability: 10 },
          { id: "contact", name: "Contact Made", color: "bg-purple-500", probability: 30 },
          { id: "proposal", name: "Proposal Sent", color: "bg-yellow-500", probability: 60 },
          { id: "negotiation", name: "Negotiation", color: "bg-orange-500", probability: 80 },
          { id: "won", name: "Won", color: "bg-green-500", probability: 100 },
          { id: "lost", name: "Lost", color: "bg-red-500", probability: 0 }
        ],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });

      // 2. Create companies
      const companiesData = [
        {
          id: "company-1",
          workspaceId,
          name: "Acme Corporation",
          industry: "Software & SaaS",
          sizeRange: "100-500",
          website: "acme.com",
          address: { street: "123 Innovation Way", city: "San Francisco", state: "CA" },
          status: "Active",
          healthScore: 92,
          lifetimeValue: 45000,
          createdAt: serverTimestamp()
        },
        {
          id: "company-2",
          workspaceId,
          name: "Globex Corporation",
          industry: "Cybersecurity",
          sizeRange: "500-1000",
          website: "globex.io",
          address: { street: "88 Security Blvd", city: "Austin", state: "TX" },
          status: "Active",
          healthScore: 78,
          lifetimeValue: 120000,
          createdAt: serverTimestamp()
        },
        {
          id: "company-3",
          workspaceId,
          name: "Stark Industries",
          industry: "Aerospace & Tech",
          sizeRange: "10000+",
          website: "starkindustries.com",
          address: { street: "10880 Malibu Point", city: "Malibu", state: "CA" },
          status: "Lead",
          healthScore: 65,
          lifetimeValue: 500000,
          createdAt: serverTimestamp()
        }
      ];

      for (const comp of companiesData) {
        await setDoc(doc(firestore, "companies", comp.id), comp, { merge: true });
      }

      // 3. Create contacts
      const contactsData = [
        {
          id: "contact-1",
          workspaceId,
          companyId: "company-1",
          companyName: "Acme Corporation",
          firstName: "John",
          lastName: "Doe",
          email: "john.doe@acme.com",
          jobTitle: "Product Manager",
          createdAt: serverTimestamp()
        },
        {
          id: "contact-2",
          workspaceId,
          companyId: "company-2",
          companyName: "Globex Corporation",
          firstName: "Jane",
          lastName: "Smith",
          email: "jane.smith@globex.io",
          jobTitle: "Security Lead",
          createdAt: serverTimestamp()
        },
        {
          id: "contact-3",
          workspaceId,
          companyId: "company-3",
          companyName: "Stark Industries",
          firstName: "Pepper",
          lastName: "Potts",
          email: "pepper.potts@stark.com",
          jobTitle: "Chief Executive Officer",
          createdAt: serverTimestamp()
        },
        {
          id: "contact-4",
          workspaceId,
          companyId: "company-3",
          companyName: "Stark Industries",
          firstName: "Tony",
          lastName: "Stark",
          email: "tony@stark.com",
          jobTitle: "Chief Technology Officer",
          createdAt: serverTimestamp()
        }
      ];

      for (const cont of contactsData) {
        await setDoc(doc(firestore, "contacts", cont.id), cont, { merge: true });
      }

      // 4. Create deals
      const dealsData = [
        {
          id: "deal-1",
          workspaceId,
          pipelineId: "pipeline-demo",
          stageId: "proposal",
          companyId: "company-1",
          companyName: "Acme Corporation",
          title: "Acme Web Redesign & Integration",
          value: 25000,
          probability: 60,
          status: "Open",
          expectedCloseDate: "2026-08-30",
          createdAt: serverTimestamp()
        },
        {
          id: "deal-2",
          workspaceId,
          pipelineId: "pipeline-demo",
          stageId: "negotiation",
          companyId: "company-2",
          companyName: "Globex Corporation",
          title: "Globex Cybersecurity Implementation",
          value: 85000,
          probability: 80,
          status: "Open",
          expectedCloseDate: "2026-09-15",
          createdAt: serverTimestamp()
        },
        {
          id: "deal-3",
          workspaceId,
          pipelineId: "pipeline-demo",
          stageId: "won",
          companyId: "company-3",
          companyName: "Stark Industries",
          title: "Stark Arc Reactor Grid Integration",
          value: 1500000,
          probability: 100,
          status: "Won",
          expectedCloseDate: "2026-06-01",
          createdAt: serverTimestamp()
        },
        {
          id: "deal-4",
          workspaceId,
          pipelineId: "pipeline-demo",
          stageId: "contact",
          companyId: "company-3",
          companyName: "Stark Industries",
          title: "Stark Automated Drone Control Software",
          value: 320000,
          probability: 30,
          status: "Open",
          expectedCloseDate: "2026-12-05",
          createdAt: serverTimestamp()
        },
        {
          id: "deal-5",
          workspaceId,
          pipelineId: "pipeline-demo",
          stageId: "lost",
          companyId: "company-1",
          companyName: "Acme Corporation",
          title: "Acme Legacy Database Conversion",
          value: 45000,
          probability: 0,
          status: "Lost",
          expectedCloseDate: "2026-05-15",
          createdAt: serverTimestamp()
        }
      ];

      for (const dl of dealsData) {
        await setDoc(doc(firestore, "deals", dl.id), dl, { merge: true });
      }

      // 5. Create projects
      const projectsData = [
        {
          id: "project-1",
          workspaceId,
          companyId: "company-3",
          companyName: "Stark Industries",
          name: "Stark Arc Integration",
          description: "Develop the frontend dashboard and secure APIs to interface with the new Arc coupling grid.",
          status: "Active",
          priority: "Critical",
          budget: 1500000,
          budgetSpent: 200000,
          healthStatus: "On Track",
          startDate: "2026-06-01",
          targetEndDate: "2027-06-01",
          members: { [currentUserId]: "Admin" },
          createdAt: serverTimestamp()
        },
        {
          id: "project-2",
          workspaceId,
          companyId: "company-1",
          companyName: "Acme Corporation",
          name: "Acme Web Redesign",
          description: "Full redesign of the customer-facing portal with Next.js and Tailwind.",
          status: "Active",
          priority: "High",
          budget: 25000,
          budgetSpent: 15000,
          healthStatus: "At Risk",
          startDate: "2026-05-01",
          targetEndDate: "2026-10-01",
          members: { [currentUserId]: "Admin" },
          createdAt: serverTimestamp()
        }
      ];

      for (const proj of projectsData) {
        await setDoc(doc(firestore, "projects", proj.id), proj, { merge: true });
      }

      // 6. Create tasks inside projects subcollections
      const tasksProject1 = [
        {
          id: "task-1-1",
          projectId: "project-1",
          title: "Review safety protocols",
          description: "Analyze reactor coupling grid electromagnetic shielding logs.",
          status: "done",
          priority: "Critical",
          assignedToId: currentUserId,
          estimatedHours: 10,
          actualHours: 12,
          dueDate: "2026-06-15",
          createdAt: serverTimestamp()
        },
        {
          id: "task-1-2",
          projectId: "project-1",
          title: "Design interface adapters",
          description: "Create secure CAD designs for the coupling grid dashboard interface.",
          status: "in-progress",
          priority: "High",
          assignedToId: currentUserId,
          estimatedHours: 40,
          actualHours: 25,
          dueDate: "2026-07-20",
          createdAt: serverTimestamp()
        },
        {
          id: "task-1-3",
          projectId: "project-1",
          title: "Conduct integration tests",
          description: "Deploy mock adapters and run telemetry tests on Stark dev servers.",
          status: "todo",
          priority: "Critical",
          assignedToId: null,
          estimatedHours: 20,
          actualHours: 0,
          dueDate: "2026-08-10",
          createdAt: serverTimestamp()
        }
      ];

      for (const t of tasksProject1) {
        await setDoc(doc(firestore, "projects", "project-1", "tasks", t.id), t, { merge: true });
      }

      const tasksProject2 = [
        {
          id: "task-2-1",
          projectId: "project-2",
          title: "Finalize wireframes",
          description: "Gather feedback from Acme design team on proposed dashboard layout.",
          status: "done",
          priority: "Medium",
          assignedToId: currentUserId,
          estimatedHours: 15,
          actualHours: 14,
          dueDate: "2026-05-30",
          createdAt: serverTimestamp()
        },
        {
          id: "task-2-2",
          projectId: "project-2",
          title: "Frontend development",
          description: "Construct responsive pages using standard Radix primitives and Tailwind styles.",
          status: "in-progress",
          priority: "High",
          assignedToId: currentUserId,
          estimatedHours: 60,
          actualHours: 45,
          dueDate: "2026-09-01",
          createdAt: serverTimestamp()
        }
      ];

      for (const t of tasksProject2) {
        await setDoc(doc(firestore, "projects", "project-2", "tasks", t.id), t, { merge: true });
      }

      // 7. Create subtasks for task-1-2
      const subtasks = [
        { id: "sub-1", title: "Draft coupling schematics", status: "done", ownerId: currentUserId, projectId: "project-1", taskId: "task-1-2", members: { [currentUserId]: "Admin" }, createdAt: serverTimestamp() },
        { id: "sub-2", title: "Verify thermal expansion load", status: "pending", ownerId: currentUserId, projectId: "project-1", taskId: "task-1-2", members: { [currentUserId]: "Admin" }, createdAt: serverTimestamp() },
        { id: "sub-3", title: "Export final vector blueprint", status: "pending", ownerId: currentUserId, projectId: "project-1", taskId: "task-1-2", members: { [currentUserId]: "Admin" }, createdAt: serverTimestamp() }
      ];

      for (const sub of subtasks) {
        await setDoc(doc(firestore, "projects", "project-1", "tasks", "task-1-2", "subtasks", sub.id), sub, { merge: true });
      }

      // 8. Create time entries
      const timeEntries = [
        {
          id: "time-1",
          userId: currentUserId,
          projectId: "project-1",
          taskId: "task-1-1",
          startTime: "2026-06-03T09:00:00.000Z",
          endTime: "2026-06-03T17:00:00.000Z",
          duration: 8,
          isBillable: true,
          description: "Reviewing safety parameters with Pepper Potts",
          createdAt: serverTimestamp()
        },
        {
          id: "time-2",
          userId: currentUserId,
          projectId: "project-1",
          taskId: "task-1-2",
          startTime: "2026-06-04T10:00:00.000Z",
          endTime: "2026-06-04T16:00:00.000Z",
          duration: 6,
          isBillable: true,
          description: "Figma wireframe and CAD adaptation session",
          createdAt: serverTimestamp()
        },
        {
          id: "time-3",
          userId: currentUserId,
          projectId: "project-2",
          taskId: "task-2-1",
          startTime: "2026-05-28T09:00:00.000Z",
          endTime: "2026-05-28T14:30:00.000Z",
          duration: 5.5,
          isBillable: true,
          description: "Wireframes design final review",
          createdAt: serverTimestamp()
        }
      ];

      for (const entry of timeEntries) {
        await setDoc(doc(firestore, "users", currentUserId, "timeEntries", entry.id), entry, { merge: true });
      }

      toast({
        title: "Seeding Successful",
        description: "Standard CRM deals, companies, projects, and tasks have been initialized.",
      });
    } catch (e: any) {
      toast({
        title: "Seeding Failed",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setSeeding(false);
    }
  };

  const handleClearData = async () => {
    if (!firestore || !profile?.currentWorkspaceId || !user?.uid) return;
    if (!confirm("CRITICAL WARNING: This will permanently delete all projects, tasks, deals, companies, and contacts in this workspace. Are you sure you want to proceed?")) {
      return;
    }
    setClearing(true);
    const workspaceId = profile.currentWorkspaceId;
    const currentUserId = user.uid;

    try {
      // 1. Clear deals
      const dealsSnap = await getDocs(query(collection(firestore, "deals"), where("workspaceId", "==", workspaceId)));
      for (const d of dealsSnap.docs) {
        await deleteDoc(d.ref);
      }

      // 2. Clear companies
      const companiesSnap = await getDocs(query(collection(firestore, "companies"), where("workspaceId", "==", workspaceId)));
      for (const d of companiesSnap.docs) {
        await deleteDoc(d.ref);
      }

      // 3. Clear contacts
      const contactsSnap = await getDocs(query(collection(firestore, "contacts"), where("workspaceId", "==", workspaceId)));
      for (const d of contactsSnap.docs) {
        await deleteDoc(d.ref);
      }

      // 4. Clear pipelines
      const pipelinesSnap = await getDocs(query(collection(firestore, "pipelines"), where("workspaceId", "==", workspaceId)));
      for (const d of pipelinesSnap.docs) {
        await deleteDoc(d.ref);
      }

      // 5. Clear projects and their nested tasks & subtasks
      const projectsSnap = await getDocs(query(collection(firestore, "projects"), where("workspaceId", "==", workspaceId)));
      for (const projDoc of projectsSnap.docs) {
        const projId = projDoc.id;
        const tasksSnap = await getDocs(collection(firestore, "projects", projId, "tasks"));
        for (const taskDoc of tasksSnap.docs) {
          const taskId = taskDoc.id;
          const subtasksSnap = await getDocs(collection(firestore, "projects", projId, "tasks", taskId, "subtasks"));
          for (const subDoc of subtasksSnap.docs) {
            await deleteDoc(subDoc.ref);
          }
          await deleteDoc(taskDoc.ref);
        }
        await deleteDoc(projDoc.ref);
      }

      // 6. Clear user time entries
      const timeEntriesSnap = await getDocs(collection(firestore, "users", currentUserId, "timeEntries"));
      for (const t of timeEntriesSnap.docs) {
        await deleteDoc(t.ref);
      }

      toast({
        title: "Workspace Purged",
        description: "All workspace operational data has been deleted.",
      });
    } catch (e: any) {
      toast({
        title: "Error Purging Workspace",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setClearing(false);
    }
  };

  // If not Admin, display Access Denied
  if (!isMembersLoading && !isAdmin) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center h-[70vh] text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
            <Shield className="w-10 h-10" />
          </div>
          <div className="space-y-2 max-w-md">
            <h2 className="text-2xl font-black tracking-tight text-foreground">Super Admin Access Denied</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Your profile is registered as a <span className="font-bold text-foreground">{profile?.role || "Team Member"}</span>. 
              Only users with the <span className="font-bold text-destructive">Admin</span> role can access global workspace configurations.
            </p>
          </div>
          <Button asChild className="gap-2">
            <Link href="/dashboard">
              <ArrowLeft className="w-4 h-4" /> Return to Dashboard
            </Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-8 pb-12">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
            <Shield className="w-8 h-8 text-destructive" />
            Super Admin Control Panel
          </h1>
          <p className="text-muted-foreground mt-1">Configure global workspace parameters, manage users, and run databases tools.</p>
        </div>

        {/* Global Statistics */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <AdminStatCard title="Total Users" value={members?.length || 0} icon={<Users />} />
          <AdminStatCard title="Projects" value={projects?.length || 0} icon={<FolderKanban />} />
          <AdminStatCard title="Deals Logged" value={deals?.length || 0} icon={<LineChart />} />
          <AdminStatCard title="Client Orgs" value={companies?.length || 0} icon={<Building2 />} />
        </div>

        <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
          {/* Main Controls: Tabs for User Management & Roles/Permissions */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className={`${activeTab === "saas" ? "lg:col-span-3" : "lg:col-span-2"} space-y-6`}>
            <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-4' : 'grid-cols-3'} bg-secondary/10 h-auto gap-2 p-2 rounded-xl`}>
              <TabsTrigger value="users" className="gap-2 text-xs py-2">
                <Users className="w-4 h-4" /> Users Directory
              </TabsTrigger>
              <TabsTrigger value="roles" className="gap-2 text-xs py-2">
                <Key className="w-4 h-4" /> Roles & Permissions
              </TabsTrigger>
              <TabsTrigger value="hierarchy" className="gap-2 text-xs py-2">
                <Building2 className="w-4 h-4" /> Corporate Hierarchy
              </TabsTrigger>
              {isAdmin && (
                <TabsTrigger value="saas" className="gap-2 text-xs py-2">
                  <Shield className="w-4 h-4" /> Global SaaS Control
                </TabsTrigger>
              )}
            </TabsList>

            {/* Users Directory Tab */}
            <TabsContent value="users" className="mt-0">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-lg">User Directory & Role Manager</CardTitle>
                  <CardDescription>View all users mapped to this workspace and dynamically edit their roles.</CardDescription>
                </CardHeader>
                <CardContent>
                  {isMembersLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                  ) : (
                    <div className="border rounded-xl overflow-hidden bg-white/50 backdrop-blur-sm">
                      <Table>
                        <TableHeader className="bg-secondary/5">
                          <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Custom Roles</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {members?.map((member) => (
                            <TableRow key={member.id}>
                              <TableCell className="font-bold flex items-center gap-3">
                                <Avatar className="w-8 h-8">
                                  <AvatarImage src={`https://picsum.photos/seed/${member.id}/100/100`} />
                                  <AvatarFallback>{member.firstName?.[0]}</AvatarFallback>
                                </Avatar>
                                <span>{member.firstName} {member.lastName}</span>
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground font-medium">{member.email}</TableCell>
                              <TableCell className="max-w-[200px]">
                                <div className="flex flex-wrap gap-1">
                                  {member.roles && member.roles.length > 0 ? (
                                    member.roles.map((rId: string) => {
                                      const role = workspaceRoles?.find((r) => r.id === rId);
                                      return (
                                        <Badge key={rId} variant="secondary" className="text-[9px] font-bold px-1.5 py-0.5">
                                          {role?.name || rId}
                                        </Badge>
                                      );
                                    })
                                  ) : (
                                    <span className="text-[10px] text-muted-foreground italic">No custom roles</span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2 items-center">
                                  <Select 
                                    disabled={updatingRole === member.id}
                                    value={member.role || "Team Member"} 
                                    onValueChange={(v) => handleRoleChange(member.id, v)}
                                  >
                                    <SelectTrigger className="w-[110px] h-8 text-[11px] bg-white">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="Admin">Admin</SelectItem>
                                      <SelectItem value="Project Manager">Project Manager</SelectItem>
                                      <SelectItem value="Team Member">Team Member</SelectItem>
                                      <SelectItem value="Client">Client</SelectItem>
                                    </SelectContent>
                                  </Select>

                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    className="h-8 text-[10px] font-bold uppercase tracking-wider px-2"
                                    onClick={() => {
                                      setSelectedMember(member);
                                      setIsManageRolesOpen(true);
                                    }}
                                  >
                                    Edit Roles
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Roles & Permissions Tab */}
            <TabsContent value="roles" className="mt-0">
              <Card className="glass-card">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Workspace Roles & Custom Permissions</CardTitle>
                    <CardDescription>Define custom security policies and map granular permissions to roles.</CardDescription>
                  </div>
                  <Button 
                    size="sm" 
                    className="gap-1.5 text-xs font-bold uppercase tracking-wider"
                    onClick={() => {
                      setNewRoleName("");
                      setNewRolePermissions([]);
                      setIsCreateRoleOpen(true);
                    }}
                  >
                    <Plus className="w-4 h-4" /> Add Role
                  </Button>
                </CardHeader>
                <CardContent>
                  {isRolesLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {workspaceRoles && workspaceRoles.length > 0 ? (
                        workspaceRoles.map((role) => (
                          <div key={role.id} className="p-4 rounded-xl border bg-white/40 backdrop-blur-sm hover:border-primary/20 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="space-y-2 max-w-lg">
                              <div className="flex items-center gap-2">
                                <h3 className="font-bold text-sm text-foreground">{role.name}</h3>
                                {["role_workspace_administrator", "role_sales_manager", "role_standard_rep"].includes(role.id) && (
                                  <Badge variant="outline" className="text-[9px] uppercase font-bold text-primary bg-primary/5">Default</Badge>
                                )}
                              </div>
                              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                {role.permissions?.length || 0} permissions mapped
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {role.permissions && role.permissions.length > 0 ? (
                                  role.permissions.map((pKey: string) => (
                                    <Badge key={pKey} variant="outline" className="text-[8px] font-mono font-medium px-1 bg-secondary/5">
                                      {pKey}
                                    </Badge>
                                  ))
                                ) : (
                                  <span className="text-[10px] text-muted-foreground italic">No permissions assigned</span>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2 shrink-0">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 text-[10px] font-bold uppercase tracking-wider px-3"
                                onClick={() => {
                                  setEditingRole(role);
                                  setEditRoleName(role.name);
                                  setEditRolePermissions(role.permissions || []);
                                  setIsEditRoleOpen(true);
                                }}
                              >
                                Edit permissions
                              </Button>
                              {!["role_workspace_administrator", "role_sales_manager", "role_standard_rep"].includes(role.id) && (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="h-8 text-[10px] font-bold uppercase tracking-wider px-2 text-destructive border-destructive/20 hover:bg-destructive/5"
                                  onClick={() => handleDeleteRole(role.id)}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-12 border border-dashed rounded-xl opacity-50 italic text-sm">
                          No custom roles defined. Click &quot;Add Role&quot; above to initialize.
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Corporate Hierarchy Management Tab */}
            <TabsContent value="hierarchy" className="mt-0 space-y-6">
              {/* Subsidiaries Management */}
              <Card className="glass-card">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Subsidiaries (Companies)</CardTitle>
                    <CardDescription>Manage internal legal entities and business subsidiaries under the holdings group.</CardDescription>
                  </div>
                  <Button 
                    size="sm" 
                    className="gap-1.5 text-xs font-bold uppercase tracking-wider"
                    onClick={() => {
                      setNewSubsidiaryName("");
                      setIsCreateSubsidiaryOpen(true);
                    }}
                  >
                    <Plus className="w-4 h-4" /> Add Subsidiary
                  </Button>
                </CardHeader>
                <CardContent>
                  {isSubsidiariesLoading ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : subsidiaries && subsidiaries.length > 0 ? (
                    <div className="border rounded-xl overflow-hidden bg-white/50">
                      <Table>
                        <TableHeader className="bg-secondary/5">
                          <TableRow>
                            <TableHead>Company Name</TableHead>
                            <TableHead>ID</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {subsidiaries.map((sub) => (
                            <TableRow key={sub.id}>
                              <TableCell className="font-bold flex items-center gap-2 py-3">
                                <Building2 className="w-4 h-4 text-primary" />
                                {sub.name}
                              </TableCell>
                              <TableCell className="text-xs font-mono text-muted-foreground">{sub.id}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    className="h-8 text-xs font-bold"
                                    onClick={() => {
                                      setEditingSubsidiary(sub);
                                      setEditSubsidiaryName(sub.name);
                                      setIsEditSubsidiaryOpen(true);
                                    }}
                                  >
                                    Rename
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    className="h-8 text-xs font-bold text-destructive border-destructive/20 hover:bg-destructive/5"
                                    onClick={() => handleDeleteSubsidiary(sub.id)}
                                  >
                                    Delete
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8 border border-dashed rounded-xl opacity-50 italic text-sm">
                      No subsidiaries created yet. Click &quot;Add Subsidiary&quot; to begin.
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Departments Management */}
              <Card className="glass-card">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Departments</CardTitle>
                    <CardDescription>Manage divisions and functional departments within your subsidiaries.</CardDescription>
                  </div>
                  <Button 
                    size="sm" 
                    className="gap-1.5 text-xs font-bold uppercase tracking-wider"
                    disabled={!subsidiaries || subsidiaries.length === 0}
                    onClick={() => {
                      setNewDepartmentName("");
                      setNewDepartmentSubId(subsidiaries?.[0]?.id || "");
                      setIsCreateDepartmentOpen(true);
                    }}
                  >
                    <Plus className="w-4 h-4" /> Add Department
                  </Button>
                </CardHeader>
                <CardContent>
                  {isDepartmentsLoading ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : departments && departments.length > 0 ? (
                    <div className="border rounded-xl overflow-hidden bg-white/50">
                      <Table>
                        <TableHeader className="bg-secondary/5">
                          <TableRow>
                            <TableHead>Department Name</TableHead>
                            <TableHead>Subsidiary Company</TableHead>
                            <TableHead>ID</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {departments.map((dept) => {
                            const parentSub = subsidiaries?.find(s => s.id === dept.subsidiaryId);
                            return (
                              <TableRow key={dept.id}>
                                <TableCell className="font-bold py-3">{dept.name}</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="text-[10px] font-bold">
                                    {parentSub?.name || "Unknown Subsidiary"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-xs font-mono text-muted-foreground">{dept.id}</TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-2">
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      className="h-8 text-xs font-bold"
                                      onClick={() => {
                                        setEditingDepartment(dept);
                                        setEditDepartmentName(dept.name);
                                        setEditDepartmentSubId(dept.subsidiaryId);
                                        setIsEditDepartmentOpen(true);
                                      }}
                                    >
                                      Edit
                                    </Button>
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      className="h-8 text-xs font-bold text-destructive border-destructive/20 hover:bg-destructive/5"
                                      onClick={() => handleDeleteDepartment(dept.id)}
                                    >
                                      Delete
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8 border border-dashed rounded-xl opacity-50 italic text-sm">
                      No departments created yet. Click &quot;Add Department&quot; to begin.
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Teams Management */}
              <Card className="glass-card">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Teams</CardTitle>
                    <CardDescription>Manage tactical team groups inside corporate departments.</CardDescription>
                  </div>
                  <Button 
                    size="sm" 
                    className="gap-1.5 text-xs font-bold uppercase tracking-wider"
                    disabled={!departments || departments.length === 0}
                    onClick={() => {
                      setNewTeamName("");
                      setNewTeamSubId(departments?.[0]?.subsidiaryId || "");
                      setNewTeamDeptId(departments?.[0]?.id || "");
                      setIsCreateTeamOpen(true);
                    }}
                  >
                    <Plus className="w-4 h-4" /> Add Team
                  </Button>
                </CardHeader>
                <CardContent>
                  {isTeamsLoading ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : teams && teams.length > 0 ? (
                    <div className="border rounded-xl overflow-hidden bg-white/50">
                      <Table>
                        <TableHeader className="bg-secondary/5">
                          <TableRow>
                            <TableHead>Team Name</TableHead>
                            <TableHead>Department</TableHead>
                            <TableHead>Subsidiary</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {teams.map((team) => {
                            const parentDept = departments?.find(d => d.id === team.departmentId);
                            const parentSub = subsidiaries?.find(s => s.id === team.subsidiaryId);
                            return (
                              <TableRow key={team.id}>
                                <TableCell className="font-bold py-3">{team.name}</TableCell>
                                <TableCell className="text-xs font-medium text-muted-foreground">
                                  {parentDept?.name || "Unknown Dept"}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="text-[10px] font-bold">
                                    {parentSub?.name || "Unknown Subsidiary"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-2">
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      className="h-8 text-xs font-bold"
                                      onClick={() => {
                                        setEditingTeam(team);
                                        setEditTeamName(team.name);
                                        setEditTeamSubId(team.subsidiaryId);
                                        setEditTeamDeptId(team.departmentId);
                                        setIsEditTeamOpen(true);
                                      }}
                                    >
                                      Edit
                                    </Button>
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      className="h-8 text-xs font-bold text-destructive border-destructive/20 hover:bg-destructive/5"
                                      onClick={() => handleDeleteTeam(team.id)}
                                    >
                                      Delete
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8 border border-dashed rounded-xl opacity-50 italic text-sm">
                      No teams created yet. Click &quot;Add Team&quot; to begin.
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Member Assignments */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-lg">Corporate Directory Mapping</CardTitle>
                  <CardDescription>Assign workspace participants to their respective Subsidiary, Department, and Team.</CardDescription>
                </CardHeader>
                <CardContent>
                  {isMembersLoading ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : (
                    <div className="border rounded-xl overflow-hidden bg-white/50">
                      <Table>
                        <TableHeader className="bg-secondary/5">
                          <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Subsidiary</TableHead>
                            <TableHead>Department</TableHead>
                            <TableHead>Team</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {members?.map((member) => {
                            const sub = subsidiaries?.find(s => s.id === member.subsidiaryId);
                            const dept = departments?.find(d => d.id === member.departmentId);
                            const team = teams?.find(t => t.id === member.teamId);
                            return (
                              <TableRow key={member.id}>
                                <TableCell className="font-bold flex items-center gap-3 py-3">
                                  <Avatar className="w-8 h-8">
                                    <AvatarImage src={`https://picsum.photos/seed/${member.id}/100/100`} />
                                    <AvatarFallback>{member.firstName?.[0]}</AvatarFallback>
                                  </Avatar>
                                  <span>{member.firstName} {member.lastName}</span>
                                </TableCell>
                                <TableCell className="text-xs font-semibold">
                                  {sub ? sub.name : <span className="text-muted-foreground italic">Unassigned</span>}
                                </TableCell>
                                <TableCell className="text-xs font-medium text-muted-foreground">
                                  {dept ? dept.name : <span className="italic">Unassigned</span>}
                                </TableCell>
                                <TableCell>
                                  {team ? (
                                    <Badge variant="secondary" className="text-[10px] font-bold">
                                      {team.name}
                                    </Badge>
                                  ) : (
                                    <span className="text-[10px] text-muted-foreground italic">Unassigned</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    className="h-8 text-xs font-bold uppercase tracking-wider"
                                    onClick={() => {
                                      setAssigningMember(member);
                                      setMemberAssignedSubId(member.subsidiaryId || "");
                                      setMemberAssignedDeptId(member.departmentId || "");
                                      setMemberAssignedTeamId(member.teamId || "");
                                      setIsAssignMemberOpen(true);
                                    }}
                                  >
                                    Assign Unit
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>


            {/* Global SaaS Control Tab */}
            {isAdmin && (
              <TabsContent value="saas" className="mt-0 space-y-6">
                {/* Workspaces Management Card */}
                <Card className="glass-card">
                  <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Building2 className="w-5 h-5 text-primary" />
                          Global Workspaces
                        </CardTitle>
                        <CardDescription>
                          View all workspaces in the SaaS system and switch contexts to inspect their data.
                        </CardDescription>
                      </div>
                      <div className="flex gap-2 items-center w-full md:w-auto">
                        <div className="relative flex-1 md:w-72">
                          <Input
                            placeholder="Search workspaces..."
                            value={workspaceSearch}
                            onChange={(e) => setWorkspaceSearch(e.target.value)}
                            className="bg-white/50 text-xs pl-8 h-9"
                          />
                          <span className="absolute left-2.5 top-2.5 text-muted-foreground">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={1.5}
                              stroke="currentColor"
                              className="w-4 h-4"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                              />
                            </svg>
                          </span>
                        </div>
                        <Button 
                          size="sm" 
                          className="gap-1.5 text-xs font-bold uppercase tracking-wider h-9 shrink-0"
                          onClick={() => {
                            setNewWorkspaceName("");
                            setNewWorkspaceOwner("");
                            setIsAddWorkspaceOpen(true);
                          }}
                        >
                          <Plus className="w-4 h-4" /> Add Workspace
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {isWorkspacesLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      </div>
                    ) : filteredWorkspaces.length === 0 ? (
                      <div className="text-center py-12 border border-dashed rounded-xl opacity-50 italic text-sm">
                        No workspaces found matching the query.
                      </div>
                    ) : (
                      <div className="border rounded-xl overflow-x-auto bg-white/50 backdrop-blur-sm">
                        <Table>
                          <TableHeader className="bg-secondary/5">
                            <TableRow>
                              <TableHead>Workspace Name</TableHead>
                              <TableHead>Workspace ID</TableHead>
                              <TableHead>Owner UID</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredWorkspaces.map((ws) => {
                              const isCurrent = profile?.currentWorkspaceId === ws.id;
                              return (
                                <TableRow key={ws.id} className={isCurrent ? "bg-primary/5 font-semibold" : ""}>
                                  <TableCell className="font-bold flex items-center gap-3 py-4">
                                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-black">
                                      {ws.name?.[0]?.toUpperCase() || "W"}
                                    </div>
                                    <div className="flex flex-col">
                                      <span>{ws.name}</span>
                                      <span className="text-[10px] text-muted-foreground font-normal">slug: {ws.slug}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-xs font-mono">{ws.id}</TableCell>
                                  <TableCell className="text-xs text-muted-foreground font-mono">{ws.ownerId || "N/A"}</TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex justify-end gap-2 items-center">
                                      {isCurrent ? (
                                        <Badge variant="secondary" className="text-[10px] font-bold bg-green-500/10 text-green-600 border-green-500/20 px-3 py-1">
                                          Current Context
                                        </Badge>
                                      ) : (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="h-8 text-xs font-bold bg-white text-primary hover:bg-primary/5 border-primary/20"
                                          disabled={switchingWorkspaceId !== null}
                                          onClick={() => handleSwitchWorkspace(ws.id)}
                                        >
                                          {switchingWorkspaceId === ws.id ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                                          ) : null}
                                          Inspect
                                        </Button>
                                      )}
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={isCurrent}
                                        className="h-8 text-xs font-bold text-destructive border-destructive/20 hover:bg-destructive/5"
                                        onClick={() => handleDeleteWorkspace(ws.id)}
                                      >
                                        Delete
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Global Users Management Card */}
                <Card className="glass-card">
                  <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Users className="w-5 h-5 text-primary" />
                          Global Users Directory
                        </CardTitle>
                        <CardDescription>
                          Manage all registered users, their global access roles, and inspect their active workspaces.
                        </CardDescription>
                      </div>
                      <div className="flex gap-2 items-center w-full md:w-auto">
                        <div className="relative flex-1 md:w-72">
                          <Input
                            placeholder="Search users..."
                            value={userSearch}
                            onChange={(e) => setUserSearch(e.target.value)}
                            className="bg-white/50 text-xs pl-8 h-9"
                          />
                          <span className="absolute left-2.5 top-2.5 text-muted-foreground">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={1.5}
                              stroke="currentColor"
                              className="w-4 h-4"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                              />
                            </svg>
                          </span>
                        </div>
                        <Button 
                          size="sm" 
                          className="gap-1.5 text-xs font-bold uppercase tracking-wider h-9 shrink-0"
                          onClick={() => {
                            setNewUserFirstName("");
                            setNewUserLastName("");
                            setNewUserEmail("");
                            setNewUserGlobalRole("Team Member");
                            setNewUserWorkspaceId(globalWorkspaces?.[0]?.id || "");
                            setIsAddUserOpen(true);
                          }}
                        >
                          <Plus className="w-4 h-4" /> Add User
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {isGlobalUsersLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      </div>
                    ) : filteredUsers.length === 0 ? (
                      <div className="text-center py-12 border border-dashed rounded-xl opacity-50 italic text-sm">
                        No users found matching the query.
                      </div>
                    ) : (
                      <div className="border rounded-xl overflow-x-auto bg-white/50 backdrop-blur-sm">
                        <Table>
                          <TableHeader className="bg-secondary/5">
                            <TableRow>
                              <TableHead>User</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead>Global Role</TableHead>
                              <TableHead>Active Workspace</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredUsers.map((u) => (
                              <TableRow key={u.id}>
                                <TableCell className="font-bold flex items-center gap-3 py-4">
                                  <Avatar className="w-8 h-8">
                                    <AvatarImage src={`https://picsum.photos/seed/${u.id}/100/100`} />
                                    <AvatarFallback>{u.firstName?.[0] || "U"}</AvatarFallback>
                                  </Avatar>
                                  <div className="flex flex-col">
                                    <span>{u.firstName} {u.lastName}</span>
                                    <span className="text-[10px] text-muted-foreground font-mono font-normal">{u.id}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-xs font-medium text-muted-foreground">{u.email}</TableCell>
                                <TableCell>
                                  <Badge variant={u.role === "Admin" ? "destructive" : "outline"} className="text-[10px] font-bold">
                                    {u.role || "Team Member"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-xs font-mono text-muted-foreground">
                                  {u.currentWorkspaceId || "None"}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-2 items-center">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-8 text-xs font-bold bg-white text-primary hover:bg-primary/5 border-primary/20"
                                      onClick={() => handleOpenEditPermissions(u)}
                                    >
                                      Edit Permissions
                                    </Button>
                                    {u.currentWorkspaceId && u.currentWorkspaceId !== profile?.currentWorkspaceId ? (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8 text-xs font-bold bg-white text-accent hover:bg-accent/5 border-accent/20"
                                        disabled={switchingWorkspaceId !== null}
                                        onClick={() => handleSwitchWorkspace(u.currentWorkspaceId)}
                                      >
                                        Inspect
                                      </Button>
                                    ) : null}
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      disabled={u.id === user?.uid}
                                      className="h-8 text-xs font-bold text-destructive border-destructive/20 hover:bg-destructive/5"
                                      onClick={() => handleDeleteUserProfile(u.id, u.currentWorkspaceId)}
                                    >
                                      Delete
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>

          {/* Manage Roles Dialog */}
          <Dialog open={isManageRolesOpen} onOpenChange={setIsManageRolesOpen}>
            <DialogContent className="sm:max-w-[425px] glass-card">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Lock className="w-5 h-5 text-primary" />
                  Manage Custom Roles
                </DialogTitle>
                <DialogDescription>
                  Assign custom roles to {selectedMember?.firstName} {selectedMember?.lastName} to grant granular permissions.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {isRolesLoading ? (
                  <div className="flex justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>
                ) : (
                  <div className="space-y-3 max-h-[220px] overflow-y-auto pr-2">
                    {workspaceRoles && workspaceRoles.length > 0 ? (
                      workspaceRoles.map((role) => {
                        const isChecked = selectedMember?.roles?.includes(role.id) || false;
                        return (
                          <div key={role.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-secondary/10 transition-colors">
                            <Checkbox 
                              id={`role-check-${role.id}`}
                              checked={isChecked}
                              onCheckedChange={(checked) => {
                                const currentRoles = selectedMember?.roles || [];
                                let updatedRoles;
                                if (checked) {
                                  updatedRoles = [...currentRoles, role.id];
                                } else {
                                  updatedRoles = currentRoles.filter((id: string) => id !== role.id);
                                }
                                setSelectedMember({ ...selectedMember, roles: updatedRoles });
                              }}
                            />
                            <div className="grid gap-1 leading-none">
                              <Label htmlFor={`role-check-${role.id}`} className="text-xs font-bold cursor-pointer">
                                {role.name}
                              </Label>
                              <p className="text-[10px] text-muted-foreground">
                                {role.permissions?.length || 0} permissions mapped
                              </p>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-xs text-muted-foreground italic">No roles defined. Create roles in the Roles & Permissions tab.</p>
                    )}
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setIsManageRolesOpen(false)} className="text-xs font-bold uppercase">
                  Cancel
                </Button>
                <Button 
                  disabled={updatingMemberRoles || !selectedMember} 
                  onClick={() => handleSaveMemberRoles(selectedMember.id, selectedMember.roles || [])}
                  className="text-xs font-bold uppercase tracking-wider"
                >
                  {updatingMemberRoles && <Loader2 className="w-3 h-3 animate-spin mr-2" />}
                  Save Changes
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Create Custom Role Dialog */}
          <Dialog open={isCreateRoleOpen} onOpenChange={setIsCreateRoleOpen}>
            <DialogContent className="sm:max-w-[500px] glass-card">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Plus className="w-5 h-5 text-primary" />
                  Create Custom Role
                </DialogTitle>
                <DialogDescription>
                  Define a new custom role and check the granular permissions that belong to it.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="role-name-input">Role Name</Label>
                  <Input 
                    id="role-name-input"
                    placeholder="e.g. Support Representative" 
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Permissions Map</Label>
                  <div className="grid grid-cols-1 gap-2 max-h-[220px] overflow-y-auto pr-2 border rounded-xl p-3 bg-secondary/5">
                    {ALL_PERMISSIONS.map((permKey) => {
                      const isChecked = newRolePermissions.includes(permKey);
                      return (
                        <div key={permKey} className="flex items-start gap-3 p-1.5 rounded hover:bg-secondary/10 transition-colors">
                          <Checkbox 
                            id={`create-perm-${permKey}`}
                            checked={isChecked}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setNewRolePermissions([...newRolePermissions, permKey]);
                              } else {
                                setNewRolePermissions(newRolePermissions.filter((k) => k !== permKey));
                              }
                            }}
                          />
                          <div className="grid gap-0.5 leading-none">
                            <Label htmlFor={`create-perm-${permKey}`} className="text-xs font-bold cursor-pointer font-mono text-primary/90">
                              {permKey}
                            </Label>
                            <p className="text-[10px] text-muted-foreground">
                              {PERMISSIONS[permKey]}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setIsCreateRoleOpen(false)} className="text-xs font-bold uppercase">
                  Cancel
                </Button>
                <Button 
                  disabled={!newRoleName} 
                  onClick={handleCreateRole}
                  className="text-xs font-bold uppercase tracking-wider"
                >
                  Create Role
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit Custom Role Dialog */}
          <Dialog open={isEditRoleOpen} onOpenChange={setIsEditRoleOpen}>
            <DialogContent className="sm:max-w-[500px] glass-card">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Lock className="w-5 h-5 text-primary" />
                  Edit Custom Role
                </DialogTitle>
                <DialogDescription>
                  Modify the permissions map or role name for this workspace role.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-role-name-input">Role Name</Label>
                  <Input 
                    id="edit-role-name-input"
                    placeholder="e.g. Support Representative" 
                    value={editRoleName}
                    onChange={(e) => setEditRoleName(e.target.value)}
                    disabled={["role_workspace_administrator", "role_sales_manager", "role_standard_rep"].includes(editingRole?.id)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Permissions Map</Label>
                  <div className="grid grid-cols-1 gap-2 max-h-[220px] overflow-y-auto pr-2 border rounded-xl p-3 bg-secondary/5">
                    {ALL_PERMISSIONS.map((permKey) => {
                      const isChecked = editRolePermissions.includes(permKey);
                      return (
                        <div key={permKey} className="flex items-start gap-3 p-1.5 rounded hover:bg-secondary/10 transition-colors">
                          <Checkbox 
                            id={`edit-perm-${permKey}`}
                            checked={isChecked}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setEditRolePermissions([...editRolePermissions, permKey]);
                              } else {
                                setEditRolePermissions(editRolePermissions.filter((k) => k !== permKey));
                              }
                            }}
                          />
                          <div className="grid gap-0.5 leading-none">
                            <Label htmlFor={`edit-perm-${permKey}`} className="text-xs font-bold cursor-pointer font-mono text-primary/90">
                              {permKey}
                            </Label>
                            <p className="text-[10px] text-muted-foreground">
                              {PERMISSIONS[permKey]}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setIsEditRoleOpen(false)} className="text-xs font-bold uppercase">
                  Cancel
                </Button>
                <Button 
                  disabled={!editRoleName} 
                  onClick={handleEditRole}
                  className="text-xs font-bold uppercase tracking-wider"
                >
                  Save Changes
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Assign Member Dialog */}
          <Dialog open={isAssignMemberOpen} onOpenChange={setIsAssignMemberOpen}>
            <DialogContent className="sm:max-w-[425px] glass-card">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  Map Member to Corporate Unit
                </DialogTitle>
                <DialogDescription>
                  Align {assigningMember?.firstName} {assigningMember?.lastName} with a Subsidiary, Department, and Team.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="member-sub-select">Subsidiary Company</Label>
                  <Select 
                    value={memberAssignedSubId} 
                    onValueChange={(v) => {
                      setMemberAssignedSubId(v);
                      setMemberAssignedDeptId("");
                      setMemberAssignedTeamId("");
                    }}
                  >
                    <SelectTrigger id="member-sub-select" className="bg-white">
                      <SelectValue placeholder="Select Subsidiary" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none_clear">Unassigned</SelectItem>
                      {subsidiaries?.map(sub => (
                        <SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="member-dept-select">Department</Label>
                  <Select 
                    disabled={!memberAssignedSubId || memberAssignedSubId === "none_clear"}
                    value={memberAssignedDeptId} 
                    onValueChange={(v) => {
                      setMemberAssignedDeptId(v);
                      setMemberAssignedTeamId("");
                    }}
                  >
                    <SelectTrigger id="member-dept-select" className="bg-white">
                      <SelectValue placeholder="Select Department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none_clear">Unassigned</SelectItem>
                      {departments?.filter(d => d.subsidiaryId === memberAssignedSubId).map(dept => (
                        <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="member-team-select">Team</Label>
                  <Select 
                    disabled={!memberAssignedDeptId || memberAssignedDeptId === "none_clear"}
                    value={memberAssignedTeamId} 
                    onValueChange={setMemberAssignedTeamId}
                  >
                    <SelectTrigger id="member-team-select" className="bg-white">
                      <SelectValue placeholder="Select Team" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none_clear">Unassigned</SelectItem>
                      {teams?.filter(t => t.departmentId === memberAssignedDeptId).map(team => (
                        <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setIsAssignMemberOpen(false)} className="text-xs font-bold uppercase">
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveMemberAssignments}
                  className="text-xs font-bold uppercase tracking-wider"
                >
                  Save Alignment
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Create Subsidiary Dialog */}
          <Dialog open={isCreateSubsidiaryOpen} onOpenChange={setIsCreateSubsidiaryOpen}>
            <DialogContent className="sm:max-w-[425px] glass-card">
              <DialogHeader>
                <DialogTitle>Add Subsidiary Company</DialogTitle>
                <DialogDescription>Create a new company subsidiary under this holdings group.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="create-sub-name">Company Name</Label>
                  <Input 
                    id="create-sub-name"
                    placeholder="e.g. Lynk Tech LLC"
                    value={newSubsidiaryName}
                    onChange={(e) => setNewSubsidiaryName(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setIsCreateSubsidiaryOpen(false)} className="text-xs font-bold uppercase">
                  Cancel
                </Button>
                <Button 
                  disabled={!newSubsidiaryName}
                  onClick={handleAddSubsidiary}
                  className="text-xs font-bold uppercase tracking-wider"
                >
                  Create Company
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit Subsidiary Dialog */}
          <Dialog open={isEditSubsidiaryOpen} onOpenChange={setIsEditSubsidiaryOpen}>
            <DialogContent className="sm:max-w-[425px] glass-card">
              <DialogHeader>
                <DialogTitle>Rename Subsidiary Company</DialogTitle>
                <DialogDescription>Update the name of this subsidiary company.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-sub-name">Company Name</Label>
                  <Input 
                    id="edit-sub-name"
                    value={editSubsidiaryName}
                    onChange={(e) => setEditSubsidiaryName(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setIsEditSubsidiaryOpen(false)} className="text-xs font-bold uppercase">
                  Cancel
                </Button>
                <Button 
                  disabled={!editSubsidiaryName}
                  onClick={handleEditSubsidiary}
                  className="text-xs font-bold uppercase tracking-wider"
                >
                  Save Changes
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Create Department Dialog */}
          <Dialog open={isCreateDepartmentOpen} onOpenChange={setIsCreateDepartmentOpen}>
            <DialogContent className="sm:max-w-[425px] glass-card">
              <DialogHeader>
                <DialogTitle>Add Department</DialogTitle>
                <DialogDescription>Create a department division within a subsidiary.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="create-dept-name">Department Name</Label>
                  <Input 
                    id="create-dept-name"
                    placeholder="e.g. Engineering"
                    value={newDepartmentName}
                    onChange={(e) => setNewDepartmentName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-dept-sub-select">Subsidiary Company</Label>
                  <Select value={newDepartmentSubId} onValueChange={setNewDepartmentSubId}>
                    <SelectTrigger id="create-dept-sub-select" className="bg-white">
                      <SelectValue placeholder="Select Subsidiary" />
                    </SelectTrigger>
                    <SelectContent>
                      {subsidiaries?.map(sub => (
                        <SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setIsCreateDepartmentOpen(false)} className="text-xs font-bold uppercase">
                  Cancel
                </Button>
                <Button 
                  disabled={!newDepartmentName || !newDepartmentSubId}
                  onClick={handleAddDepartment}
                  className="text-xs font-bold uppercase tracking-wider"
                >
                  Create Department
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit Department Dialog */}
          <Dialog open={isEditDepartmentOpen} onOpenChange={setIsEditDepartmentOpen}>
            <DialogContent className="sm:max-w-[425px] glass-card">
              <DialogHeader>
                <DialogTitle>Edit Department</DialogTitle>
                <DialogDescription>Modify details for this department.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-dept-name">Department Name</Label>
                  <Input 
                    id="edit-dept-name"
                    value={editDepartmentName}
                    onChange={(e) => setEditDepartmentName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-dept-sub-select">Subsidiary Company</Label>
                  <Select value={editDepartmentSubId} onValueChange={setEditDepartmentSubId}>
                    <SelectTrigger id="edit-dept-sub-select" className="bg-white">
                      <SelectValue placeholder="Select Subsidiary" />
                    </SelectTrigger>
                    <SelectContent>
                      {subsidiaries?.map(sub => (
                        <SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setIsEditDepartmentOpen(false)} className="text-xs font-bold uppercase">
                  Cancel
                </Button>
                <Button 
                  disabled={!editDepartmentName || !editDepartmentSubId}
                  onClick={handleEditDepartment}
                  className="text-xs font-bold uppercase tracking-wider"
                >
                  Save Changes
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Create Team Dialog */}
          <Dialog open={isCreateTeamOpen} onOpenChange={setIsCreateTeamOpen}>
            <DialogContent className="sm:max-w-[425px] glass-card">
              <DialogHeader>
                <DialogTitle>Add Team</DialogTitle>
                <DialogDescription>Create a team inside a corporate department.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="create-team-name">Team Name</Label>
                  <Input 
                    id="create-team-name"
                    placeholder="e.g. Frontend Core"
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-team-sub-select">Subsidiary Company</Label>
                  <Select 
                    value={newTeamSubId} 
                    onValueChange={(v) => {
                      setNewTeamSubId(v);
                      setNewTeamDeptId("");
                    }}
                  >
                    <SelectTrigger id="create-team-sub-select" className="bg-white">
                      <SelectValue placeholder="Select Subsidiary" />
                    </SelectTrigger>
                    <SelectContent>
                      {subsidiaries?.map(sub => (
                        <SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-team-dept-select">Department</Label>
                  <Select 
                    disabled={!newTeamSubId}
                    value={newTeamDeptId} 
                    onValueChange={setNewTeamDeptId}
                  >
                    <SelectTrigger id="create-team-dept-select" className="bg-white">
                      <SelectValue placeholder="Select Department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments?.filter(d => d.subsidiaryId === newTeamSubId).map(dept => (
                        <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setIsCreateTeamOpen(false)} className="text-xs font-bold uppercase">
                  Cancel
                </Button>
                <Button 
                  disabled={!newTeamName || !newTeamSubId || !newTeamDeptId}
                  onClick={handleAddTeam}
                  className="text-xs font-bold uppercase tracking-wider"
                >
                  Create Team
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit Team Dialog */}
          <Dialog open={isEditTeamOpen} onOpenChange={setIsEditTeamOpen}>
            <DialogContent className="sm:max-w-[425px] glass-card">
              <DialogHeader>
                <DialogTitle>Edit Team</DialogTitle>
                <DialogDescription>Modify details for this team.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-team-name">Team Name</Label>
                  <Input 
                    id="edit-team-name"
                    value={editTeamName}
                    onChange={(e) => setEditTeamName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-team-sub-select">Subsidiary Company</Label>
                  <Select 
                    value={editTeamSubId} 
                    onValueChange={(v) => {
                      setEditTeamSubId(v);
                      setEditTeamDeptId("");
                    }}
                  >
                    <SelectTrigger id="edit-team-sub-select" className="bg-white">
                      <SelectValue placeholder="Select Subsidiary" />
                    </SelectTrigger>
                    <SelectContent>
                      {subsidiaries?.map(sub => (
                        <SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-team-dept-select">Department</Label>
                  <Select 
                    disabled={!editTeamSubId}
                    value={editTeamDeptId} 
                    onValueChange={setEditTeamDeptId}
                  >
                    <SelectTrigger id="edit-team-dept-select" className="bg-white">
                      <SelectValue placeholder="Select Department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments?.filter(d => d.subsidiaryId === editTeamSubId).map(dept => (
                        <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setIsEditTeamOpen(false)} className="text-xs font-bold uppercase">
                  Cancel
                </Button>
                <Button 
                  disabled={!editTeamName || !editTeamSubId || !editTeamDeptId}
                  onClick={handleEditTeam}
                  className="text-xs font-bold uppercase tracking-wider"
                >
                  Save Changes
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Add Workspace Dialog */}
          <Dialog open={isAddWorkspaceOpen} onOpenChange={setIsAddWorkspaceOpen}>
            <DialogContent className="sm:max-w-[425px] glass-card">
              <DialogHeader>
                <DialogTitle>Add Workspace</DialogTitle>
                <DialogDescription>Create a new global workspace inside the SaaS system.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="create-ws-name">Workspace Name</Label>
                  <Input 
                    id="create-ws-name"
                    placeholder="e.g. Acme Corp"
                    value={newWorkspaceName}
                    onChange={(e) => setNewWorkspaceName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-ws-owner">Owner User (Optional)</Label>
                  <Select value={newWorkspaceOwner} onValueChange={setNewWorkspaceOwner}>
                    <SelectTrigger id="create-ws-owner" className="bg-white">
                      <SelectValue placeholder="Select Owner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No Owner (Unassigned)</SelectItem>
                      {globalUsers?.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.firstName} {u.lastName} ({u.email || u.id})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setIsAddWorkspaceOpen(false)} className="text-xs font-bold uppercase">
                  Cancel
                </Button>
                <Button 
                  disabled={!newWorkspaceName}
                  onClick={handleCreateWorkspace}
                  className="text-xs font-bold uppercase tracking-wider"
                >
                  Create Workspace
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Add User Dialog */}
          <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
            <DialogContent className="sm:max-w-[425px] glass-card">
              <DialogHeader>
                <DialogTitle>Add User</DialogTitle>
                <DialogDescription>Register a new user profile on the platform.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="create-user-firstname">First Name</Label>
                  <Input 
                    id="create-user-firstname"
                    placeholder="e.g. John"
                    value={newUserFirstName}
                    onChange={(e) => setNewUserFirstName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-user-lastname">Last Name</Label>
                  <Input 
                    id="create-user-lastname"
                    placeholder="e.g. Doe"
                    value={newUserLastName}
                    onChange={(e) => setNewUserLastName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-user-email">Email Address</Label>
                  <Input 
                    id="create-user-email"
                    type="email"
                    placeholder="e.g. john.doe@company.com"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-user-globalrole">Global SaaS Role</Label>
                  <Select value={newUserGlobalRole} onValueChange={setNewUserGlobalRole}>
                    <SelectTrigger id="create-user-globalrole" className="bg-white">
                      <SelectValue placeholder="Select Global Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Admin">Admin (Super Admin)</SelectItem>
                      <SelectItem value="Team Member">Team Member</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-user-ws">Current Workspace Context</Label>
                  <Select value={newUserWorkspaceId} onValueChange={setNewUserWorkspaceId}>
                    <SelectTrigger id="create-user-ws" className="bg-white">
                      <SelectValue placeholder="Select Active Workspace" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None (No Active Workspace)</SelectItem>
                      {globalWorkspaces?.map((ws) => (
                        <SelectItem key={ws.id} value={ws.id}>
                          {ws.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setIsAddUserOpen(false)} className="text-xs font-bold uppercase">
                  Cancel
                </Button>
                <Button 
                  disabled={!newUserFirstName || !newUserEmail}
                  onClick={handleCreateUserProfile}
                  className="text-xs font-bold uppercase tracking-wider"
                >
                  Create User
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit User Permissions Dialog */}
          <Dialog open={isEditPermissionsOpen} onOpenChange={setIsEditPermissionsOpen}>
            <DialogContent className="sm:max-w-[500px] glass-card">
              <DialogHeader>
                <DialogTitle>Edit User Permissions</DialogTitle>
                <DialogDescription>
                  Modify roles and custom permissions for {selectedUserPerms?.firstName} {selectedUserPerms?.lastName}.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-user-globalrole">Global SaaS Role</Label>
                  <Select value={userPermsGlobalRole} onValueChange={setUserPermsGlobalRole}>
                    <SelectTrigger id="edit-user-globalrole" className="bg-white">
                      <SelectValue placeholder="Select Global Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Admin">Admin (Super Admin)</SelectItem>
                      <SelectItem value="Team Member">Team Member</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-user-ws">Active Workspace Context</Label>
                  <Select 
                    value={userPermsWorkspaceId} 
                    onValueChange={async (v) => {
                      setUserPermsWorkspaceId(v);
                      setUserPermsWorkspaceRole("Team Member");
                      setUserPermsCustomRoles([]);
                      await fetchWorkspaceRoles(v);
                    }}
                  >
                    <SelectTrigger id="edit-user-ws" className="bg-white">
                      <SelectValue placeholder="Select Workspace Context" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None (No Workspace Context)</SelectItem>
                      {globalWorkspaces?.map((ws) => (
                        <SelectItem key={ws.id} value={ws.id}>
                          {ws.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {userPermsWorkspaceId && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="edit-user-wsrole">Workspace System Role</Label>
                      <Select value={userPermsWorkspaceRole} onValueChange={setUserPermsWorkspaceRole}>
                        <SelectTrigger id="edit-user-wsrole" className="bg-white">
                          <SelectValue placeholder="Select Workspace Role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Admin">Workspace Admin</SelectItem>
                          <SelectItem value="Team Member">Workspace Team Member</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Workspace Custom Roles</Label>
                      {loadingWorkspaceRoles ? (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                          <Loader2 className="w-4 h-4 animate-spin text-primary" /> Loading custom roles...
                        </div>
                      ) : userPermsCustomRolesList && userPermsCustomRolesList.length > 0 ? (
                        <div className="grid grid-cols-1 gap-2 max-h-[150px] overflow-y-auto pr-2 border rounded-xl p-3 bg-secondary/5">
                          {userPermsCustomRolesList.map((role) => {
                            const isChecked = userPermsCustomRoles.includes(role.id);
                            return (
                              <div key={role.id} className="flex items-center space-x-2">
                                <Checkbox 
                                  id={`edit-user-customrole-${role.id}`}
                                  checked={isChecked}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setUserPermsCustomRoles([...userPermsCustomRoles, role.id]);
                                    } else {
                                      setUserPermsCustomRoles(userPermsCustomRoles.filter((id) => id !== role.id));
                                    }
                                  }}
                                />
                                <Label htmlFor={`edit-user-customrole-${role.id}`} className="text-xs cursor-pointer font-medium">
                                  {role.name}
                                </Label>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic py-1">No custom roles defined in this workspace.</p>
                      )}
                    </div>
                  </>
                )}
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setIsEditPermissionsOpen(false)} className="text-xs font-bold uppercase">
                  Cancel
                </Button>
                <Button 
                  onClick={handleUpdateUserPermissions}
                  className="text-xs font-bold uppercase tracking-wider"
                >
                  Save Permissions
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Database Tools Sidebar */}
          {activeTab !== "saas" && (
            <div className="space-y-6">
              <Card className="glass-card border-accent/20">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Database className="w-5 h-5 text-accent" />
                    Database Tools
                  </CardTitle>
                  <CardDescription>Seed demo configurations or reset the active workspace data.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 space-y-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs font-bold">Populate Demo Sandbox</h4>
                        <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
                          Fills this workspace with 3 companies, 4 contacts, 5 pipeline deals, 2 projects, 5 tasks, checklists, and 3 logged times.
                        </p>
                      </div>
                    </div>
                    <Button 
                      disabled={seeding || clearing} 
                      onClick={handleSeedData}
                      className="w-full gap-2 text-xs font-bold uppercase tracking-widest bg-primary"
                    >
                      {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                      Seed Workspace
                    </Button>
                  </div>

                  <div className="p-4 rounded-xl bg-destructive/5 border border-destructive/10 space-y-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs font-bold text-destructive">Wipe Operational Data</h4>
                        <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
                          Deletes all projects, tasks, deals, contacts, companies, pipelines, and logged times. This cannot be undone.
                        </p>
                      </div>
                    </div>
                    <Button 
                      variant="outline"
                      disabled={seeding || clearing} 
                      onClick={handleClearData}
                      className="w-full gap-2 text-xs font-bold uppercase tracking-widest text-destructive hover:bg-destructive/5 border-destructive/20"
                    >
                      {clearing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      Clear Workspace
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">System Integrity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span>Connection Mode</span>
                    <Badge variant="outline" className="text-green-500 bg-green-500/5 uppercase border-green-500/20 text-[9px] font-bold">Realtime Sync</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function AdminStatCard({ title, value, icon }: { title: string, value: string | number, icon: React.ReactNode }) {
  return (
    <Card className="glass-card">
      <CardContent className="p-4 sm:p-6 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">{title}</p>
          <p className="text-2xl sm:text-3xl font-black tracking-tight text-foreground mt-1">{value}</p>
        </div>
        <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-secondary/30 flex items-center justify-center text-primary/70 shrink-0">
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}
