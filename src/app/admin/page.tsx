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
          <Tabs defaultValue="users" className="lg:col-span-2 space-y-6">
            <TabsList className="grid w-full grid-cols-2 bg-secondary/10 h-auto gap-2 p-2 rounded-xl">
              <TabsTrigger value="users" className="gap-2 text-xs py-2">
                <Users className="w-4 h-4" /> Users Directory
              </TabsTrigger>
              <TabsTrigger value="roles" className="gap-2 text-xs py-2">
                <Key className="w-4 h-4" /> Roles & Permissions
              </TabsTrigger>
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

          {/* Database Tools Sidebar */}
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
