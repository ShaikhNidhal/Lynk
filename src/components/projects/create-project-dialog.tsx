
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
import { Plus, Loader2, Users, Search, Check, X, Briefcase, Handshake } from "lucide-react";
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
  const [selectedMembers, setSelectedMembers] = useState<{id: string, email: string, name: string, projectRole: string, globalRole: string}[]>([]);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "Scrum",
  });

  // Fetch users for selection (Limited to first 50 for search)
  const usersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, "users"), limit(50));
  }, [firestore]);

  const { data: allUsers } = useCollection(usersQuery);

  const filteredUsers = allUsers?.filter(u => 
    u.id !== user?.uid && 
    !selectedMembers.find(m => m.id === u.id) &&
    (u.email?.toLowerCase().includes(userSearch.toLowerCase()) || 
     u.firstName?.toLowerCase().includes(userSearch.toLowerCase()) ||
     u.lastName?.toLowerCase().includes(userSearch.toLowerCase()))
  );

  const addMember = (u: any) => {
    setSelectedMembers([...selectedMembers, { 
      id: u.id, 
      email: u.email, 
      name: `${u.firstName} ${u.lastName}`,
      projectRole: u.role === "Client" ? "client" : "member",
      globalRole: u.role || "Team Member"
    }]);
    setUserSearch("");
  };

  const removeMember = (id: string) => {
    setSelectedMembers(selectedMembers.filter(m => m.id !== id));
  };

  const updateMemberRole = (id: string, role: string) => {
    setSelectedMembers(selectedMembers.map(m => m.id === id ? { ...m, projectRole: role } : m));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !firestore) return;

    setLoading(true);
    try {
      const membersMap: Record<string, string> = {
        [user.uid]: "owner"
      };

      selectedMembers.forEach(m => {
        membersMap[m.id] = m.projectRole;
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
          <Button className="gap-2 shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4" />
            Create Project
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-hidden flex flex-col p-0 glass-card">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-primary" />
            New Workspace
          </DialogTitle>
          <DialogDescription>
            Configure your project board and invite collaborators or clients.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleCreate} className="flex-1 overflow-y-auto p-6 space-y-8">
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Project Name</Label>
                <Input 
                  id="name" 
                  placeholder="e.g., Customer Portal 2.0" 
                  required 
                  className="bg-white"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Methodology</Label>
                <Select 
                  value={formData.type} 
                  onValueChange={(value) => setFormData({...formData, type: value})}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Scrum">Agile Scrum</SelectItem>
                    <SelectItem value="Kanban">Kanban</SelectItem>
                    <SelectItem value="Hybrid">Hybrid Workflow</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Project Objective</Label>
              <Textarea 
                id="description" 
                placeholder="Describe the main goals and scope of this workspace..." 
                className="bg-white min-h-[100px]"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-border">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 font-bold text-sm tracking-tight">
                <Users className="w-4 h-4 text-primary" />
                Invite Members & Stakeholders
              </Label>
              {selectedMembers.length > 0 && (
                <Badge variant="secondary" className="h-5 rounded-sm px-1.5">{selectedMembers.length} invited</Badge>
              )}
            </div>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search by name, email, or role (e.g. 'Client')..." 
                className="pl-9 bg-white"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
              />
              {userSearch && filteredUsers && filteredUsers.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-xl max-h-60 overflow-y-auto border-primary/10">
                  {filteredUsers.map(u => (
                    <button
                      key={u.id}
                      type="button"
                      className="w-full flex items-center justify-between p-3 hover:bg-primary/5 text-left transition-colors border-b last:border-0 border-border"
                      onClick={() => addMember(u)}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="w-9 h-9 border">
                          <AvatarImage src={`https://picsum.photos/seed/${u.id}/100/100`} />
                          <AvatarFallback className="bg-secondary text-primary font-bold">{u.firstName?.[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-bold text-foreground truncate">{u.firstName} {u.lastName}</span>
                          <span className="text-[10px] text-muted-foreground truncate">{u.email}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[9px] font-bold uppercase py-0 px-1.5 h-4 border-primary/20">
                          {u.role || "Member"}
                        </Badge>
                        <Plus className="w-4 h-4 text-primary opacity-40" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3">
              {selectedMembers.map(m => (
                <div key={m.id} className="flex items-center justify-between p-3 bg-white/50 rounded-xl border border-border hover:border-primary/20 transition-all">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-9 h-9 border">
                      <AvatarImage src={`https://picsum.photos/seed/${m.id}/100/100`} />
                      <AvatarFallback className="bg-primary text-white font-bold">{m.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-foreground leading-tight">{m.name}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-muted-foreground font-medium">{m.email}</span>
                        <span className="text-[10px] text-primary/50 font-bold uppercase tracking-tighter">• {m.globalRole}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-secondary/20 p-1 rounded-lg">
                       <button 
                         type="button"
                         onClick={() => updateMemberRole(m.id, 'member')}
                         className={`text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-md transition-all ${m.projectRole === 'member' ? 'bg-white shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                       >
                         Team
                       </button>
                       <button 
                         type="button"
                         onClick={() => updateMemberRole(m.id, 'client')}
                         className={`text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-md transition-all flex items-center gap-1 ${m.projectRole === 'client' ? 'bg-accent text-accent-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                       >
                         {m.projectRole === 'client' && <Handshake className="w-2.5 h-2.5" />}
                         Client
                       </button>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-destructive hover:bg-destructive/10"
                      onClick={() => removeMember(m.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {selectedMembers.length === 0 && !userSearch && (
                <div className="text-center py-10 rounded-xl border-2 border-dashed border-border bg-secondary/5">
                  <Users className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground italic">
                    Search above to add team members or external clients.
                  </p>
                </div>
              )}
            </div>
          </div>
        </form>

        <DialogFooter className="p-6 border-t border-border bg-secondary/10">
          <Button type="button" variant="ghost" onClick={() => setIsOpen(false)} className="text-xs font-bold uppercase tracking-widest">
            Cancel
          </Button>
          <Button 
            onClick={handleCreate} 
            disabled={loading || !formData.name} 
            className="gap-2 shadow-lg shadow-primary/20 px-8"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Initialize Project
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
