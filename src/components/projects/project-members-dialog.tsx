
"use client";

import React, { useState } from "react";
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
import { 
  Plus, 
  Loader2, 
  Users, 
  Search, 
  X,
  Shield
} from "lucide-react";
import { useFirebase, useUser, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, limit, doc, serverTimestamp } from "firebase/firestore";
import { updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { toast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ProjectMembersDialogProps {
  projectId: string;
  projectName: string;
  currentMembers: Record<string, string>;
}

export function ProjectMembersDialog({ projectId, projectName, currentMembers }: ProjectMembersDialogProps) {
  const { user } = useUser();
  const { firestore } = useFirebase();
  const [isOpen, setIsOpen] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [loading, setLoading] = useState(false);

  // Fetch users for search
  const usersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, "users"), limit(20));
  }, [firestore]);

  const { data: allUsers } = useCollection(usersQuery);

  const filteredUsers = allUsers?.filter(u => 
    !currentMembers[u.id] && 
    (u.email?.toLowerCase().includes(userSearch.toLowerCase()) || 
     u.firstName?.toLowerCase().includes(userSearch.toLowerCase()))
  );

  const addMember = (userId: string, role: string = "member") => {
    if (!firestore) return;
    const newMembers = { ...currentMembers, [userId]: role };
    const projectRef = doc(firestore, "projects", projectId);
    
    updateDocumentNonBlocking(projectRef, {
      members: newMembers,
      updatedAt: serverTimestamp()
    });
    
    toast({ title: "Member Added", description: "Team member has been joined to the project." });
  };

  const removeMember = (userId: string) => {
    if (userId === user?.uid) return; // Can't remove yourself
    if (!firestore) return;
    
    const newMembers = { ...currentMembers };
    delete newMembers[userId];
    const projectRef = doc(firestore, "projects", projectId);
    
    updateDocumentNonBlocking(projectRef, {
      members: newMembers,
      updatedAt: serverTimestamp()
    });
    
    toast({ title: "Member Removed" });
  };

  const updateRole = (userId: string, newRole: string) => {
    if (!firestore) return;
    const newMembers = { ...currentMembers, [userId]: newRole };
    const projectRef = doc(firestore, "projects", projectId);
    
    updateDocumentNonBlocking(projectRef, {
      members: newMembers,
      updatedAt: serverTimestamp()
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 bg-white">
          <Users className="w-4 h-4" />
          Members
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] glass-card">
        <DialogHeader>
          <DialogTitle>Project Members</DialogTitle>
          <DialogDescription>
            Manage who has access to <strong>{projectName}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search team members to add..." 
              className="pl-9"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
            />
            {userSearch && filteredUsers && filteredUsers.length > 0 && (
              <div className="absolute z-20 w-full mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto">
                {filteredUsers.map(u => (
                  <button
                    key={u.id}
                    className="w-full flex items-center justify-between p-2 hover:bg-secondary text-left transition-colors"
                    onClick={() => addMember(u.id)}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="w-7 h-7">
                        <AvatarImage src={`https://picsum.photos/seed/${u.id}/100/100`} />
                        <AvatarFallback>{u.firstName?.[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{u.firstName} {u.lastName}</span>
                        <span className="text-[10px] text-muted-foreground">{u.email}</span>
                      </div>
                    </div>
                    <Plus className="w-4 h-4 text-primary" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Current Members</h4>
            <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2">
              {Object.entries(currentMembers).map(([uid, role]) => (
                <MemberItem 
                  key={uid} 
                  uid={uid} 
                  role={role} 
                  isOwner={uid === user?.uid}
                  onRemove={() => removeMember(uid)}
                  onRoleChange={(newRole) => updateRole(uid, newRole)}
                />
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)} className="w-full">Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MemberItem({ uid, role, isOwner, onRemove, onRoleChange }: { 
  uid: string, 
  role: string, 
  isOwner: boolean,
  onRemove: () => void,
  onRoleChange: (role: string) => void
}) {
  const { firestore } = useFirebase();
  const userRef = useMemoFirebase(() => doc(firestore, "users", uid), [firestore, uid]);
  const { data: profile } = useDoc(userRef);

  return (
    <div className="flex items-center justify-between p-2 rounded-lg bg-secondary/20 border border-border">
      <div className="flex items-center gap-3">
        <Avatar className="w-8 h-8">
          <AvatarImage src={`https://picsum.photos/seed/${uid}/100/100`} />
          <AvatarFallback>{profile?.firstName?.[0] || '?'}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <span className="text-sm font-semibold">{profile?.firstName} {profile?.lastName}</span>
          <span className="text-[10px] text-muted-foreground">{profile?.email}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Select value={role} onValueChange={onRoleChange} disabled={isOwner}>
          <SelectTrigger className="h-7 w-24 text-[10px] uppercase font-bold">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="owner">Owner</SelectItem>
            <SelectItem value="member">Member</SelectItem>
            <SelectItem value="client">Client</SelectItem>
          </SelectContent>
        </Select>
        {!isOwner && (
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={onRemove}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
