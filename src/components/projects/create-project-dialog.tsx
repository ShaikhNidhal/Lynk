
"use client";

import React, { useState, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Plus, Loader2, Users, Search, Check, X } from "lucide-react";
import { useFirebase, useUser, useCollection, useMemoFirebase } from "@/firebase";
import { collection, serverTimestamp, query, where, limit } from "firebase/firestore";
import { addDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface CreateProjectDialogProps {
  trigger?: React.ReactNode;
}

export function CreateProjectDialog({ trigger }: CreateProjectDialogProps) {
  const { user } = useUser();
  const { firestore } = useFirebase();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<{id: string, email: string, name: string, role: string}[]>([]);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "Scrum",
  });

  // Fetch users for selection (Limited to first 5 for search simulation)
  const usersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, "users"), limit(10));
  }, [firestore]);

  const { data: allUsers } = useCollection(usersQuery);

  const filteredUsers = allUsers?.filter(u => 
    u.id !== user?.uid && 
    !selectedMembers.find(m => m.id === u.id) &&
    (u.email?.toLowerCase().includes(userSearch.toLowerCase()) || 
     u.firstName?.toLowerCase().includes(userSearch.toLowerCase()))
  );

  const addMember = (u: any) => {
    setSelectedMembers([...selectedMembers, { 
      id: u.id, 
      email: u.email, 
      name: `${u.firstName} ${u.lastName}`,
      role: "Team Member" 
    }]);
    setUserSearch("");
  };

  const removeMember = (id: string) => {
    setSelectedMembers(selectedMembers.filter(m => m.id !== id));
  };

  const updateMemberRole = (id: string, role: string) => {
    setSelectedMembers(selectedMembers.map(m => m.id === id ? { ...m, role } : m));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const membersMap: Record<string, string> = {
        [user.uid]: "owner"
      };

      selectedMembers.forEach(m => {
        membersMap[m.id] = m.role === "Client" ? "client" : "member";
      });

      const projectsRef = collection(firestore, "projects");
      addDocumentNonBlocking(projectsRef, {
        name: formData.name,
        description: formData.description,
        type: formData.type,
        status: "Active",
        ownerId: user.uid,
        members: membersMap,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      toast({
        title: "Project Created",
        description: `${formData.name} has been successfully created.`,
      });
      
      setIsOpen(false);
      setFormData({ name: "", description: "", type: "Scrum" });
      setSelectedMembers([]);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create project.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2 shadow-lg shadow-primary/20">
            <Plus className="w-4 h-4" />
            Create Project
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>
            Define your workspace and invite your team.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleCreate} className="space-y-6 py-4">
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name</Label>
              <Input 
                id="name" 
                placeholder="e.g., Customer Portal 2.0" 
                required 
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea 
                id="description" 
                placeholder="What is this project about?" 
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Methodology</Label>
              <Select 
                value={formData.type} 
                onValueChange={(value) => setFormData({...formData, type: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Scrum">Agile Scrum</SelectItem>
                  <SelectItem value="Kanban">Kanban</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            <Label className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Invite Team & Clients
            </Label>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search users by name or email..." 
                className="pl-9"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
              />
              {userSearch && filteredUsers && filteredUsers.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {filteredUsers.map(u => (
                    <button
                      key={u.id}
                      type="button"
                      className="w-full flex items-center gap-3 p-2 hover:bg-secondary text-left transition-colors"
                      onClick={() => addMember(u)}
                    >
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={`https://picsum.photos/seed/${u.id}/100/100`} />
                        <AvatarFallback>{u.firstName?.[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{u.firstName} {u.lastName}</span>
                        <span className="text-xs text-muted-foreground">{u.email}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              {selectedMembers.map(m => (
                <div key={m.id} className="flex items-center justify-between p-2 bg-secondary/30 rounded-lg border border-border">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={`https://picsum.photos/seed/${m.id}/100/100`} />
                      <AvatarFallback>{m.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold">{m.name}</span>
                      <span className="text-[10px] text-muted-foreground">{m.email}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select 
                      value={m.role} 
                      onValueChange={(val) => updateMemberRole(m.id, val)}
                    >
                      <SelectTrigger className="h-8 w-32 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Team Member">Team Member</SelectItem>
                        <SelectItem value="Client">Client</SelectItem>
                        <SelectItem value="Project Manager">Project Manager</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-destructive hover:text-destructive/80"
                      onClick={() => removeMember(m.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {selectedMembers.length === 0 && !userSearch && (
                <p className="text-xs text-center py-4 text-muted-foreground italic">
                  No members added yet. Add team members or clients above.
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Project
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
