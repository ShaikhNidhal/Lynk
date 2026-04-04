
"use client";

import React, { useState, useMemo } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserCog, Loader2, FolderPlus, X, FolderKanban } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useFirebase, useUser, useCollection, useMemoFirebase } from "@/firebase";
import { doc, serverTimestamp, collection, query, where, deleteField } from "firebase/firestore";
import { updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface EditClientDialogProps {
  client: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  trigger?: React.ReactNode;
}

export function EditClientDialog({ client, trigger }: EditClientDialogProps) {
  const { profile, firestore } = useFirebase();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    firstName: client.firstName || "",
    lastName: client.lastName || "",
    email: client.email || "",
  });

  // Fetch all projects strictly for the current workspace to satisfy rules
  const projectsQuery = useMemoFirebase(() => {
    if (!firestore || !profile?.currentWorkspaceId) return null;
    return query(
      collection(firestore, "projects"),
      where("workspaceId", "==", profile.currentWorkspaceId)
    );
  }, [firestore, profile?.currentWorkspaceId]);
  
  const { data: projects, isLoading: isProjectsLoading } = useCollection(projectsQuery);

  const clientProjects = useMemo(() => {
    if (!projects) return [];
    return projects.filter(p => p.members && p.members[client.id]);
  }, [projects, client.id]);

  const availableProjects = useMemo(() => {
    if (!projects) return [];
    return projects.filter(p => !p.members || !p.members[client.id]);
  }, [projects, client.id]);

  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore) return;
    setLoading(true);

    const clientRef = doc(firestore, "users", client.id);
    
    updateDocumentNonBlocking(clientRef, {
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      updatedAt: serverTimestamp(),
    });

    toast({
      title: "Client Updated",
      description: `${formData.firstName} ${formData.lastName}'s details have been saved.`,
    });
    
    setIsOpen(false);
    setLoading(false);
  };

  const handleAssignToProject = (projectId: string) => {
    if (!firestore || projectId === "none") return;
    const projectRef = doc(firestore, "projects", projectId);
    updateDocumentNonBlocking(projectRef, {
      [`members.${client.id}`]: 'client',
      updatedAt: serverTimestamp()
    });
    toast({ title: "Project Assigned", description: "Client has been added to the project." });
  };

  const handleRemoveFromProject = (projectId: string) => {
    if (!firestore) return;
    const projectRef = doc(firestore, "projects", projectId);
    updateDocumentNonBlocking(projectRef, {
      [`members.${client.id}`]: deleteField(),
      updatedAt: serverTimestamp()
    });
    toast({ title: "Project Removed" });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="text-[9px] h-7 font-bold uppercase tracking-wider hover:text-accent hover:bg-accent/5">
            Edit Details
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] glass-card max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCog className="w-5 h-5 text-accent" />
            Manage Client
          </DialogTitle>
          <DialogDescription>
            Update profile and manage project associations for this stakeholder.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleUpdateClient} className="space-y-6 py-4">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-firstName">First Name</Label>
                <Input 
                  id="edit-firstName" 
                  required 
                  value={formData.firstName}
                  onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-lastName">Last Name</Label>
                <Input 
                  id="edit-lastName" 
                  required 
                  value={formData.lastName}
                  onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email Address</Label>
              <Input 
                id="edit-email" 
                type="email" 
                required 
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full gap-2 bg-accent hover:bg-accent/90 text-white">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Profile Changes
            </Button>
          </div>

          <Separator className="my-6" />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Workspace Associations</Label>
              <Badge variant="secondary" className="h-4 px-1 text-[9px]">{clientProjects.length} Active</Badge>
            </div>

            <div className="space-y-2">
              {clientProjects.map(project => (
                <div key={project.id} className="flex items-center justify-between p-2 rounded-md bg-secondary/10 border border-border group">
                  <div className="flex items-center gap-2">
                    <FolderKanban className="w-3.5 h-3.5 text-accent" />
                    <span className="text-xs font-medium">{project.name}</span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleRemoveFromProject(project.id)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
              {clientProjects.length === 0 && (
                <p className="text-[10px] text-muted-foreground italic text-center py-2">No projects currently linked.</p>
              )}
            </div>

            <div className="pt-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 block">Assign to Project</Label>
              <Select onValueChange={handleAssignToProject}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={isProjectsLoading ? "Loading projects..." : "Select project to link..."} />
                </SelectTrigger>
                <SelectContent>
                  {availableProjects.length > 0 ? (
                    availableProjects.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>No more projects available</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </form>

        <DialogFooter className="pt-4">
          <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="w-full">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
