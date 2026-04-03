
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
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useFirebase, useUser, useDoc, useMemoFirebase } from "@/firebase";
import { doc, serverTimestamp, deleteDoc } from "firebase/firestore";
import { updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { toast } from "@/hooks/use-toast";
import { Mail, Shield, Calendar, Loader2, Phone, Trash2, UserMinus } from "lucide-react";

interface MemberDetailsDialogProps {
  memberId: string;
  trigger?: React.ReactNode;
}

export function MemberDetailsDialog({ memberId, trigger }: MemberDetailsDialogProps) {
  const { user: currentUser } = useUser();
  const { firestore } = useFirebase();
  const [isOpen, setIsOpen] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Fetch current user profile to check if Admin
  const currentUserProfileRef = useMemoFirebase(() => {
    if (!firestore || !currentUser?.uid) return null;
    return doc(firestore, "users", currentUser.uid);
  }, [firestore, currentUser?.uid]);
  const { data: currentUserProfile } = useDoc(currentUserProfileRef);

  // Fetch the member's profile
  const memberRef = useMemoFirebase(() => {
    if (!firestore || !memberId) return null;
    return doc(firestore, "users", memberId);
  }, [firestore, memberId]);
  const { data: member, isLoading } = useDoc(memberRef);

  const isAdmin = currentUserProfile?.role === 'Admin';

  const handleUpdateRole = (newRole: string) => {
    if (!firestore || !memberId || !isAdmin) return;
    setUpdating(true);
    
    const ref = doc(firestore, "users", memberId);
    updateDocumentNonBlocking(ref, {
      role: newRole,
      updatedAt: serverTimestamp()
    });
    
    toast({
      title: "Role Updated",
      description: `${member?.firstName}'s role is now ${newRole}.`,
    });
    setUpdating(false);
  };

  const handleRemoveMember = async () => {
    if (!firestore || !memberId || !isAdmin) return;
    if (!confirm(`Are you sure you want to remove ${member?.firstName} from the workspace?`)) return;

    try {
      // 1. Remove from User Profiles
      const userRef = doc(firestore, "users", memberId);
      deleteDocumentNonBlocking(userRef);

      // 2. Remove from Workspace Members (Search for doc by userId field is needed in production, 
      // but here we use memberId as primary key for simplicity in prototype)
      const memberEntryRef = doc(firestore, "workspaceMembers", memberId);
      deleteDocumentNonBlocking(memberEntryRef);

      toast({
        title: "Member Removed",
        description: "The user has been detached from the organization.",
        variant: "destructive"
      });
      setIsOpen(false);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="text-[10px] h-7 font-bold uppercase tracking-wider hover:text-primary hover:bg-primary/5">
            View Profile
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px] glass-card">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : member ? (
          <>
            <DialogHeader className="flex flex-col items-center pb-4 border-b border-border/50">
              <div className="relative">
                <Avatar className="w-24 h-24 border-4 border-white shadow-xl mb-4">
                  <AvatarImage src={`https://picsum.photos/seed/${member.id}/200/200`} />
                  <AvatarFallback className="text-2xl font-bold bg-primary text-white">
                    {member.firstName?.[0]}{member.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                {member.isPlaceholder && (
                  <Badge className="absolute -bottom-2 right-0 bg-orange-500 text-[8px] uppercase">Pending</Badge>
                )}
              </div>
              <DialogTitle className="text-2xl font-bold">
                {member.firstName} {member.lastName}
              </DialogTitle>
              <DialogDescription className="flex items-center gap-2 mt-1">
                <Mail className="w-3.5 h-3.5" />
                {member.email}
              </DialogDescription>
            </DialogHeader>

            <div className="py-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                    <Shield className="w-3 h-3 text-primary" /> Workspace Role
                  </Label>
                  {isAdmin && member.id !== currentUser?.uid ? (
                    <div className="pt-1">
                      <Select value={member.role} onValueChange={handleUpdateRole} disabled={updating}>
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Admin">Admin</SelectItem>
                          <SelectItem value="Project Manager">Project Manager</SelectItem>
                          <SelectItem value="Team Member">Team Member</SelectItem>
                          <SelectItem value="Client">Client</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="pt-2">
                      <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                        {member.role || "Team Member"}
                      </Badge>
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="w-3 h-3 text-primary" /> Joined
                  </Label>
                  <p className="text-sm font-medium pt-2">
                    {member.createdAt?.seconds 
                      ? new Date(member.createdAt.seconds * 1000).toLocaleDateString() 
                      : 'Recently'}
                  </p>
                </div>
              </div>

              {member.phoneNumber && (
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                    <Phone className="w-3 h-3 text-primary" /> Contact Number
                  </Label>
                  <p className="text-sm font-medium pt-1">{member.phoneNumber}</p>
                </div>
              )}
            </div>

            <DialogFooter className="flex flex-col sm:flex-row gap-2 border-t border-border/50 pt-6">
              {isAdmin && member.id !== currentUser?.uid && (
                <Button variant="ghost" onClick={handleRemoveMember} className="text-destructive hover:bg-destructive/5 gap-2 text-[10px] font-bold uppercase">
                  <UserMinus className="w-4 h-4" />
                  Remove from Team
                </Button>
              )}
              <Button variant="outline" onClick={() => setIsOpen(false)} className="flex-1 font-bold uppercase tracking-widest text-[10px]">
                Close
              </Button>
            </DialogFooter>
          </>
        ) : (
          <div className="py-12 text-center text-muted-foreground">
            User details not found.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
