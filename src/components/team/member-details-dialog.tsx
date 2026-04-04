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
import { doc, serverTimestamp } from "firebase/firestore";
import { updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { toast } from "@/hooks/use-toast";
import { Mail, Shield, Calendar, Loader2, Phone, UserMinus, ExternalLink } from "lucide-react";
import Link from "next/link";

interface MemberDetailsDialogProps {
  memberId: string;
  trigger?: React.ReactNode;
}

export function MemberDetailsDialog({ memberId, trigger }: MemberDetailsDialogProps) {
  const { user: currentUser, firestore } = useFirebase();
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
    if (!firestore || !memberId || !isAdmin || !currentUserProfile?.currentWorkspaceId) return;
    if (!confirm(`Are you sure you want to remove ${member?.firstName} from the workspace?`)) return;

    try {
      // Remove from Workspace Members sub-collection
      const memberEntryRef = doc(firestore, "workspaces", currentUserProfile.currentWorkspaceId, "members", memberId);
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
            Details
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
                  <AvatarImage src={member.profilePictureUrl || `https://picsum.photos/seed/${member.id}/200/200`} />
                  <AvatarFallback className="text-2xl font-bold bg-primary text-white">
                    {member.firstName?.[0]}{member.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                {member.presenceStatus === 'online' && (
                  <div className="absolute bottom-4 right-1 w-5 h-5 rounded-full border-4 border-white bg-green-500" />
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

            <DialogFooter className="flex flex-col gap-3">
              <Button asChild className="w-full gap-2 font-bold uppercase tracking-widest text-xs h-10 shadow-lg">
                <Link href={`/team/${member.id}`}>
                  View Full Profile <ExternalLink className="w-4 h-4" />
                </Link>
              </Button>
              <div className="flex gap-2 w-full">
                {isAdmin && member.id !== currentUser?.uid && (
                  <Button variant="ghost" onClick={handleRemoveMember} className="flex-1 text-destructive hover:bg-destructive/5 gap-2 text-[10px] font-bold uppercase">
                    <UserMinus className="w-4 h-4" />
                    Remove
                  </Button>
                )}
                <Button variant="outline" onClick={() => setIsOpen(false)} className="flex-1 font-bold uppercase tracking-widest text-[10px]">
                  Close
                </Button>
              </div>
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
